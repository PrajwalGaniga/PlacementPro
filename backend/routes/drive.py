"""
routes/drive.py – Drive CRUD and applicant management.
"""

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, BackgroundTasks
from pydantic import BaseModel
from typing import List

import database as db
from utils.auth_utils import require_tpo
from utils.pdf_parser import extract_pdf_text
from utils.file_storage import save_drive_logo
from utils.gemini_interface import parse_jd_pdf, calculate_ats_score
from utils.email_service import send_drive_notification, send_status_update
from utils.validators import paginate_skip, total_pages

router = APIRouter(prefix="/drive", tags=["Drives"])


def _strip(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


# ── JD Parsing ─────────────────────────────────────────────────────────────────
@router.post("/parse-jd")
async def parse_jd(file: UploadFile = File(...), _=Depends(require_tpo)):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    text = await extract_pdf_text(file)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")
    parsed = parse_jd_pdf(text)
    return parsed


# ── Logo upload ────────────────────────────────────────────────────────────────
@router.post("/upload-logo")
async def upload_drive_logo(file: UploadFile = File(...), _=Depends(require_tpo)):
    temp_id = str(uuid.uuid4())[:8]
    url = await save_drive_logo(file, temp_id)
    return {"logo_url": url}


# ── Drive create ───────────────────────────────────────────────────────────────
class DriveCreate(BaseModel):
    company_name: str
    job_role: str
    package_ctc: str = ""
    work_location: str = ""
    job_description: str = ""
    industry_category: str = ""
    logo_path: Optional[str] = None
    bond_details: str = ""
    venue: str = ""
    gender_pref: str = "Any"
    required_certs: List[str] = []
    min_attendance_pct: float = 0.0
    min_mock_score: float = 0.0
    min_cgpa: float = 0.0
    max_backlogs: int = 10
    eligible_branches: List[str] = []
    required_skills: List[str] = []
    graduation_years: List[int] = []
    target_batches: List[str] = []
    drive_date_time: Optional[str] = None
    application_deadline: Optional[str] = None
    total_seats: Optional[int] = None
    active: bool = True


@router.post("/create")
async def create_drive(body: DriveCreate, tpo: dict = Depends(require_tpo)):
    drive_id = str(uuid.uuid4())
    college_id = tpo.get("college_id", "")
    now = datetime.utcnow()

    # Count eligible students
    query: dict = {"college_id": college_id, "is_active": True}
    if body.min_cgpa:
        query["cgpa"] = {"$gte": body.min_cgpa}
    if body.max_backlogs < 10:
        query["backlogs"] = {"$lte": body.max_backlogs}
    if body.eligible_branches:
        query["branch"] = {"$in": body.eligible_branches}
    eligible_count = await db.students().count_documents(query)

    doc = {
        "drive_id": drive_id,
        "college_id": college_id,
        "company_name": body.company_name,
        "job_role": body.job_role,
        "package_ctc": body.package_ctc,
        "work_location": body.work_location,
        "job_description": body.job_description,
        "industry_category": body.industry_category,
        "logo_path": body.logo_path,
        "bond_details": body.bond_details,
        "venue": body.venue,
        "gender_pref": body.gender_pref,
        "required_certs": body.required_certs,
        "min_attendance_pct": body.min_attendance_pct,
        "min_mock_score": body.min_mock_score,
        "min_cgpa": body.min_cgpa,
        "max_backlogs": body.max_backlogs,
        "eligible_branches": body.eligible_branches,
        "required_skills": body.required_skills,
        "graduation_years": body.graduation_years,
        "target_batches": body.target_batches,
        "drive_date_time": body.drive_date_time,
        "application_deadline": body.application_deadline,
        "total_seats": body.total_seats,
        "active": body.active,
        "applicant_count": 0,
        "eligible_count": eligible_count,
        "created_at": now,
        "created_by": tpo.get("email", ""),
    }
    await db.drives().insert_one(doc)
    doc.pop("_id", None)
    return {"drive_id": drive_id, "message": "Drive created successfully", "eligible_count": eligible_count}


# ── Drive list ─────────────────────────────────────────────────────────────────
@router.get("/list")
async def list_drives(
    active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    tpo: dict = Depends(require_tpo),
):
    query: dict = {"college_id": tpo.get("college_id", "")}
    if active is not None:
        query["active"] = active

    skip = paginate_skip(page, limit)
    total = await db.drives().count_documents(query)
    docs = await db.drives().find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(None)
    return {
        "drives": [_strip(d) for d in docs],
        "total": total,
        "page": page,
        "pages": total_pages(total, limit),
    }


@router.get("/{drive_id}")
async def get_drive(drive_id: str):
    doc = await db.drives().find_one({"drive_id": drive_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Drive not found")
    return {"drive": _strip(doc)}


@router.put("/{drive_id}/update")
async def update_drive(drive_id: str, body: dict, tpo: dict = Depends(require_tpo)):
    body.pop("_id", None)
    body.pop("drive_id", None)
    body.pop("college_id", None)
    if not body:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.drives().update_one({"drive_id": drive_id, "college_id": tpo.get("college_id")}, {"$set": body})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Drive not found")
    return {"message": "Drive updated"}


@router.put("/{drive_id}/toggle-status")
async def toggle_drive_status(drive_id: str, tpo: dict = Depends(require_tpo)):
    drive = await db.drives().find_one({"drive_id": drive_id, "college_id": tpo.get("college_id")})
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
    new_status = not drive.get("active", True)
    await db.drives().update_one({"drive_id": drive_id}, {"$set": {"active": new_status}})
    return {"message": f"Drive {'activated' if new_status else 'deactivated'}", "new_status": new_status}


@router.delete("/{drive_id}")
async def delete_drive(drive_id: str, tpo: dict = Depends(require_tpo)):
    result = await db.drives().delete_one({"drive_id": drive_id, "college_id": tpo.get("college_id")})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Drive not found")
    return {"message": "Drive deleted"}


# ── Applicant management ───────────────────────────────────────────────────────
@router.get("/{drive_id}/applicants")
async def get_applicants(
    drive_id: str,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    tpo: dict = Depends(require_tpo),
):
    app_query: dict = {"drive_id": drive_id}
    if status:
        app_query["status"] = status

    skip = paginate_skip(page, limit)
    total = await db.applications().count_documents(app_query)
    apps = await db.applications().find(app_query).sort("applied_at", -1).skip(skip).limit(limit).to_list(None)

    enriched = []
    for app in apps:
        student = await db.students().find_one({"usn": app["usn"]})
        if student:
            enriched.append({
                "application_id": app["application_id"],
                "usn": app["usn"],
                "name": student.get("name", ""),
                "email": student.get("email", ""),
                "branch": student.get("branch", ""),
                "cgpa": student.get("cgpa"),
                "skills": student.get("skills", []),
                "resume_url": app.get("resume_url", ""),
                "ats_score": app.get("ats_score"),
                "status": app.get("status", "Applied"),
                "applied_at": app.get("applied_at", "").isoformat() if isinstance(app.get("applied_at"), datetime) else app.get("applied_at", ""),
            })
    return {"applicants": enriched, "total": total, "page": page, "pages": total_pages(total, limit)}


@router.put("/{drive_id}/applicants/{usn}/status")
async def update_applicant_status(
    drive_id: str,
    usn: str,
    body: dict,
    background_tasks: BackgroundTasks,
    tpo: dict = Depends(require_tpo),
):
    new_status = body.get("status")
    if new_status not in ("Applied", "Shortlisted", "Panel 1", "Selected", "Rejected"):
        raise HTTPException(status_code=400, detail="Invalid status value")

    now = datetime.utcnow()
    result = await db.applications().update_one(
        {"drive_id": drive_id, "usn": usn.upper()},
        {"$set": {"status": new_status, "updated_at": now}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")

    # If selected, mark student as placed
    drive = await db.drives().find_one({"drive_id": drive_id})
    if new_status == "Selected" and drive:
        await db.students().update_one(
            {"usn": usn.upper()},
            {"$set": {
                "placed": True,
                "placed_company": drive.get("company_name"),
                "placed_package": drive.get("package_ctc"),
                "updated_at": now,
            }},
        )

    # Create notification for student
    notif_id = str(uuid.uuid4())
    await db.notifications().insert_one({
        "notification_id": notif_id,
        "recipient_usn": usn.upper(),
        "title": f"Application Update: {drive.get('company_name', '') if drive else ''}",
        "message": f"Your application status has been updated to: {new_status}",
        "type": "application_status",
        "related_drive_id": drive_id,
        "is_read": False,
        "created_at": now,
    })

    # Send email in background
    student = await db.students().find_one({"usn": usn.upper()})
    if student:
        background_tasks.add_task(
            send_status_update,
            student.get("email", ""),
            student.get("name", ""),
            drive.get("company_name", "") if drive else "",
            new_status,
        )

    return {"message": f"Application status updated to '{new_status}'"}


# ── Check eligibility ──────────────────────────────────────────────────────────
@router.post("/check-eligibility")
async def check_eligibility(body: dict, tpo: dict = Depends(require_tpo)):
    college_id = tpo.get("college_id", "")
    query: dict = {"college_id": college_id, "is_active": True}
    if body.get("min_cgpa"):
        query["cgpa"] = {"$gte": float(body["min_cgpa"])}
    if body.get("max_backlogs") is not None:
        query["backlogs"] = {"$lte": int(body["max_backlogs"])}
    if body.get("eligible_branches"):
        query["branch"] = {"$in": body["eligible_branches"]}
    count = await db.students().count_documents(query)
    return {"eligible_count": count}


# ── Notify eligible students ───────────────────────────────────────────────────
@router.post("/{drive_id}/notify")
async def notify_students(drive_id: str, background_tasks: BackgroundTasks, tpo: dict = Depends(require_tpo)):
    drive = await db.drives().find_one({"drive_id": drive_id, "college_id": tpo.get("college_id")})
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    # Find eligible students
    query: dict = {"college_id": tpo.get("college_id"), "is_active": True}
    if drive.get("min_cgpa"):
        query["cgpa"] = {"$gte": drive["min_cgpa"]}
    if drive.get("max_backlogs") is not None:
        query["backlogs"] = {"$lte": drive["max_backlogs"]}
    if drive.get("eligible_branches"):
        query["branch"] = {"$in": drive["eligible_branches"]}

    students = await db.students().find(query).to_list(None)
    sent = 0
    for s in students:
        background_tasks.add_task(
            send_drive_notification,
            s.get("email", ""),
            s.get("name", ""),
            drive.get("company_name", ""),
            drive.get("job_role", ""),
        )
        sent += 1

    return {"message": f"Notified {sent} eligible students", "real_emails_sent": sent}
