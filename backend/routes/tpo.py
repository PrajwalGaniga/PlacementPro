"""
routes/tpo.py – TPO-facing routes.
All require TPO or super_admin role. college_id is sourced from JWT.
"""

import io
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel

import database as db
from utils.auth_utils import require_tpo, hash_password
from utils.excel_parser import parse_student_excel, generate_student_template
from utils.file_storage import save_logo
from utils.gemini_interface import analyze_placement_data
from utils.validators import paginate_skip, total_pages

router = APIRouter(prefix="/tpo", tags=["TPO"])


def _strip(doc: dict) -> dict:
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


# ── Student list & CRUD ────────────────────────────────────────────────────────
@router.get("/students/template")
async def download_student_template(_=Depends(require_tpo)):
    excel_bytes = generate_student_template()
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=student_template.xlsx"},
    )


@router.post("/students/upload-excel")
async def upload_student_excel(
    file: UploadFile = File(...),
    tpo: dict = Depends(require_tpo),
):
    college_id = tpo.get("college_id", "")
    students, errors = await parse_student_excel(file)
    added = 0
    updated = 0

    for s in students:
        existing = await db.students().find_one({"usn": s["usn"]})
        now = datetime.utcnow()
        doc = {
            "usn": s["usn"],
            "email": s["email"],
            "name": s["name"],
            "branch": s["branch"],
            "college_id": college_id,
            "password_hash": hash_password(s["usn"]),
            "skills": [],
            "projects": [],
            "experiences": [],
            "education": [],
            "placed": False,
            "is_active": True,
            "updated_at": now,
        }
        if existing:
            # Only update core identity fields, preserve profile data
            await db.students().update_one(
                {"usn": s["usn"]},
                {"$set": {
                    "name": s["name"],
                    "email": s["email"],
                    "branch": s["branch"],
                    "college_id": college_id,
                    "updated_at": now,
                }},
            )
            updated += 1
        else:
            doc["created_at"] = now
            await db.students().insert_one(doc)
            added += 1

    return {
        "message": f"Upload complete: {added} added, {updated} updated.",
        "students_added": added,
        "students_updated": updated,
        "errors": errors,
    }


@router.get("/students/list")
async def list_students(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    branch: Optional[str] = None,
    placed: Optional[bool] = None,
    tpo: dict = Depends(require_tpo),
):
    college_id = tpo.get("college_id", "")
    query: dict = {"college_id": college_id, "is_active": True}
    if branch:
        query["branch"] = branch
    if placed is not None:
        query["placed"] = placed

    skip = paginate_skip(page, limit)
    total = await db.students().count_documents(query)
    docs = await db.students().find(query).skip(skip).limit(limit).to_list(None)
    return {
        "students": [_strip(d) for d in docs],
        "total": total,
        "page": page,
        "pages": total_pages(total, limit),
    }


@router.get("/students/{usn}")
async def get_student(usn: str, tpo: dict = Depends(require_tpo)):
    doc = await db.students().find_one({"usn": usn.upper(), "college_id": tpo.get("college_id", "")})
    if not doc:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"student": _strip(doc)}


@router.put("/students/{usn}/update")
async def update_student(usn: str, body: dict, tpo: dict = Depends(require_tpo)):
    body.pop("_id", None)
    body.pop("password_hash", None)
    body["updated_at"] = datetime.utcnow()
    result = await db.students().update_one(
        {"usn": usn.upper(), "college_id": tpo.get("college_id", "")},
        {"$set": body},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"message": "Student updated"}


@router.delete("/students/{usn}")
async def delete_student(usn: str, tpo: dict = Depends(require_tpo)):
    result = await db.students().update_one(
        {"usn": usn.upper(), "college_id": tpo.get("college_id", "")},
        {"$set": {"is_active": False}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"message": "Student deactivated"}


# ── Analytics ──────────────────────────────────────────────────────────────────
import uuid


@router.post("/analytics/analyze-excel")
async def analyze_excel(
    file: Optional[UploadFile] = File(None),
    tpo: dict = Depends(require_tpo),
):
    college_id = tpo.get("college_id", "")

    if file and file.filename:
        # Parse uploaded file
        students_raw, _ = await parse_student_excel(file)
        students = students_raw
    else:
        # Use database students
        raw_docs = await db.students().find({"college_id": college_id, "is_active": True}).to_list(None)
        students = [_strip(d) for d in raw_docs]

    if not students:
        raise HTTPException(status_code=400, detail="No student data available for analysis.")

    result = analyze_placement_data(students)

    analytics_id = str(uuid.uuid4())
    doc = {
        "analytics_id": analytics_id,
        "college_id": college_id,
        "generated_by": tpo.get("email", ""),
        "analysis_type": "excel_swot",
        "overview": result.get("overview", ""),
        "winning_edges": result.get("winning_edge", []),
        "critical_gaps": result.get("critical_gaps", []),
        "action_plan": result.get("action_plan", []),
        "raw_data_summary": result.get("raw_data_summary", {}),
        "created_at": datetime.utcnow(),
    }
    await db.analytics().insert_one(doc)
    doc.pop("_id", None)

    return {
        "winning_edge": result.get("winning_edge", []),
        "critical_gaps": result.get("critical_gaps", []),
        "action_plan": result.get("action_plan", []),
        "overview": result.get("overview", ""),
        "analytics_id": analytics_id,
    }


@router.get("/analytics/latest")
async def get_latest_analytics(tpo: dict = Depends(require_tpo)):
    doc = await db.analytics().find_one(
        {"college_id": tpo.get("college_id", "")},
        sort=[("created_at", -1)],
    )
    if not doc:
        raise HTTPException(status_code=404, detail="No analytics found")
    doc.pop("_id", None)
    return {"analytics": doc}


@router.get("/analytics/history")
async def analytics_history(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    tpo: dict = Depends(require_tpo),
):
    college_id = tpo.get("college_id", "")
    skip = paginate_skip(page, limit)
    total = await db.analytics().count_documents({"college_id": college_id})
    docs = await db.analytics().find({"college_id": college_id}).sort("created_at", -1).skip(skip).limit(limit).to_list(None)
    for d in docs:
        d.pop("_id", None)
    return {"analytics": docs, "total": total, "page": page, "pages": total_pages(total, limit)}


# ── Logo ───────────────────────────────────────────────────────────────────────
@router.post("/upload-logo")
async def upload_logo(
    file: UploadFile = File(...),
    tpo: dict = Depends(require_tpo),
):
    college_id = tpo.get("college_id", "")
    logo_url = await save_logo(file, college_id)
    await db.colleges().update_one({"college_id": college_id}, {"$set": {"logo_url": logo_url}})
    return {"logo_url": logo_url}


@router.get("/logo")
async def get_logo(tpo: dict = Depends(require_tpo)):
    college = await db.colleges().find_one({"college_id": tpo.get("college_id", "")})
    return {"logo_url": college.get("logo_url") if college else None}


# ── Stats ──────────────────────────────────────────────────────────────────────
@router.get("/stats")
async def get_tpo_stats(tpo: dict = Depends(require_tpo)):
    college_id = tpo.get("college_id", "")
    total = await db.students().count_documents({"college_id": college_id, "is_active": True})
    placed = await db.students().count_documents({"college_id": college_id, "placed": True})
    drives = await db.drives().count_documents({"college_id": college_id, "active": True})
    applications = await db.applications().count_documents({})

    return {
        "total_students": total,
        "placed": placed,
        "unplaced": total - placed,
        "placement_rate": round(placed / max(total, 1) * 100, 1),
        "active_drives": drives,
    }
