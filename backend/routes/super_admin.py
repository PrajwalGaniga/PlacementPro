"""
routes/super_admin.py – Full college + TPO CRUD and global stats.
All routes require super_admin role.
"""

import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

import database as db
from utils.auth_utils import require_super_admin, hash_password
from utils.validators import validate_pagination, paginate_skip, total_pages

router = APIRouter(prefix="/super-admin", tags=["Super Admin"])


def _strip(doc: dict) -> dict:
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


def _generate_college_id(name: str) -> str:
    words = re.sub(r"[^a-zA-Z0-9 ]", "", name).split()
    abbrev = "".join(w[0].upper() for w in words[:4])
    year = datetime.utcnow().year
    return f"{abbrev}_{year}"


# ── College CRUD ───────────────────────────────────────────────────────────────
class CollegeCreate(BaseModel):
    name: str
    place: str
    state: str
    country: str = "India"


class CollegeUpdate(BaseModel):
    name: Optional[str] = None
    place: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    logo_url: Optional[str] = None


@router.post("/college/add")
async def add_college(body: CollegeCreate, _=Depends(require_super_admin)):
    college_id = _generate_college_id(body.name)
    existing = await db.colleges().find_one({"college_id": college_id})
    if existing:
        college_id = college_id + "_2"

    doc = {
        "college_id": college_id,
        "name": body.name,
        "place": body.place,
        "state": body.state,
        "country": body.country,
        "logo_url": None,
        "created_at": datetime.utcnow(),
        "is_active": True,
    }
    await db.colleges().insert_one(doc)
    return {"college_id": college_id, "message": f"College '{body.name}' created successfully."}


@router.get("/college/list")
async def list_colleges(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    _=Depends(require_super_admin),
):
    skip = paginate_skip(page, limit)
    total = await db.colleges().count_documents({"is_active": True})
    docs = await db.colleges().find({"is_active": True}).skip(skip).limit(limit).to_list(None)
    return {
        "colleges": [_strip(d) for d in docs],
        "total": total,
        "page": page,
        "pages": total_pages(total, limit),
    }


@router.put("/college/{college_id}/update")
async def update_college(college_id: str, body: CollegeUpdate, _=Depends(require_super_admin)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.colleges().update_one({"college_id": college_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="College not found")
    return {"message": "College updated successfully"}


@router.delete("/college/{college_id}")
async def delete_college(college_id: str, _=Depends(require_super_admin)):
    result = await db.colleges().update_one({"college_id": college_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="College not found")
    return {"message": "College deactivated"}


# ── TPO CRUD ──────────────────────────────────────────────────────────────────
class TPOCreate(BaseModel):
    name: str
    email: str
    password: str
    college_id: str


class TPOUpdate(BaseModel):
    name: Optional[str] = None
    college_id: Optional[str] = None
    password: Optional[str] = None


@router.post("/tpo/add")
async def add_tpo(body: TPOCreate, _=Depends(require_super_admin)):
    email = body.email.lower()
    existing = await db.tpos().find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="TPO with this email already exists")

    college = await db.colleges().find_one({"college_id": body.college_id, "is_active": True})
    if not college:
        raise HTTPException(status_code=404, detail=f"College '{body.college_id}' not found")

    doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "college_id": body.college_id,
        "college_name": college["name"],
        "is_super_admin": False,
        "created_at": datetime.utcnow(),
        "is_active": True,
    }
    await db.tpos().insert_one(doc)
    return {"message": f"TPO '{body.name}' added successfully.", "tpo_email": email}


@router.get("/tpo/list")
async def list_tpos(
    college_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    _=Depends(require_super_admin),
):
    query: dict = {"is_active": True}
    if college_id:
        query["college_id"] = college_id

    skip = paginate_skip(page, limit)
    total = await db.tpos().count_documents(query)
    docs = await db.tpos().find(query).skip(skip).limit(limit).to_list(None)

    # Join college name if missing
    for d in docs:
        if not d.get("college_name"):
            c = await db.colleges().find_one({"college_id": d.get("college_id")})
            d["college_name"] = c["name"] if c else "Unknown"

    return {
        "tpos": [_strip(d) for d in docs],
        "total": total,
        "page": page,
        "pages": total_pages(total, limit),
    }


@router.put("/tpo/{email}/update")
async def update_tpo(email: str, body: TPOUpdate, _=Depends(require_super_admin)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if "password" in updates:
        updates["password_hash"] = hash_password(updates.pop("password"))
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.tpos().update_one({"email": email.lower()}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="TPO not found")
    return {"message": "TPO updated"}


@router.delete("/tpo/{email}")
async def delete_tpo(email: str, _=Depends(require_super_admin)):
    result = await db.tpos().update_one({"email": email.lower()}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="TPO not found")
    return {"message": "TPO deactivated"}


# ── Global Stats ──────────────────────────────────────────────────────────────
@router.get("/stats/overview")
async def stats_overview(_=Depends(require_super_admin)):
    total_colleges = await db.colleges().count_documents({"is_active": True})
    total_tpos = await db.tpos().count_documents({"is_active": True})
    total_students = await db.students().count_documents({"is_active": True})
    total_drives = await db.drives().count_documents({"active": True})

    colleges = await db.colleges().find({"is_active": True}).to_list(None)
    per_college = []
    for col in colleges:
        cid = col["college_id"]
        sc = await db.students().count_documents({"college_id": cid, "is_active": True})
        pc = await db.students().count_documents({"college_id": cid, "placed": True})
        ad = await db.drives().count_documents({"college_id": cid, "active": True})
        per_college.append({
            "college_id": cid,
            "name": col["name"],
            "total_students": sc,
            "placed_count": pc,
            "unplaced_count": sc - pc,
            "active_drives": ad,
        })

    return {
        "total_colleges": total_colleges,
        "total_tpos": total_tpos,
        "total_students": total_students,
        "total_drives": total_drives,
        "per_college": per_college,
    }


@router.get("/stats/college/{college_id}")
async def stats_college(college_id: str, _=Depends(require_super_admin)):
    college = await db.colleges().find_one({"college_id": college_id})
    if not college:
        raise HTTPException(status_code=404, detail="College not found")

    student_count = await db.students().count_documents({"college_id": college_id, "is_active": True})
    placed_count = await db.students().count_documents({"college_id": college_id, "placed": True})
    active_drives = await db.drives().count_documents({"college_id": college_id, "active": True})
    total_applications = await db.applications().count_documents({"drive_id": {"$regex": college_id}})

    # Recent placements
    placed_students = await db.students().find(
        {"college_id": college_id, "placed": True}
    ).sort("updated_at", -1).limit(5).to_list(None)
    recent = [{"name": s["name"], "usn": s["usn"], "company": s.get("placed_company", "")} for s in placed_students]

    college.pop("_id", None)
    return {
        "college": college,
        "student_count": student_count,
        "placed_count": placed_count,
        "unplaced_count": student_count - placed_count,
        "active_drives": active_drives,
        "total_applications": total_applications,
        "recent_placements": recent,
    }
