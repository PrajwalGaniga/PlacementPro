"""
routes/student.py – Student-facing endpoints.
All authenticated routes use get_current_student dependency.
"""

import uuid
import os
import io
from datetime import datetime
from typing import Optional, List
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, BackgroundTasks
from pydantic import BaseModel

import database as db
from config import settings
from utils.auth_utils import get_current_student
from utils.file_storage import save_resume, delete_resume
from utils.gemini_interface import calculate_ats_score
from utils.pdf_parser import extract_pdf_text_from_bytes
from utils.validators import paginate_skip, total_pages

router = APIRouter(prefix="/student", tags=["Student"])

ML_MODEL_PATH = Path(__file__).parent.parent / "ml_model" / "placement_model.pkl"


def _strip(doc: dict) -> dict:
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc

# ── Convenience Login (Alias for Flutter) ──────────────────────────────────────
from .auth import student_login, StudentLoginRequest
@router.post("/login")
async def student_login_alias(body: StudentLoginRequest):
    return await student_login(body)

# ── Colleges (public, no auth) ─────────────────────────────────────────────────
@router.get("/colleges")
async def get_colleges():
    docs = await db.colleges().find({"is_active": True}, {"college_id": 1, "name": 1, "_id": 0}).to_list(None)
    return {"colleges": docs}


# ── Profile ────────────────────────────────────────────────────────────────────
@router.get("/profile")
async def get_profile(student: dict = Depends(get_current_student)):
    doc = await db.students().find_one({"usn": student["usn"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Student not found")
    
    student_data = _strip(doc)
    # Add computed has_resume flag directly into profile
    student_data["has_resume"] = bool(student_data.get("resume_url"))
    
    return {"student": student_data}


@router.put("/profile/update")
async def update_profile(body: dict, student: dict = Depends(get_current_student)):
    # Protect immutable fields
    for protected in ("usn", "email", "college_id", "_id", "password_hash"):
        body.pop(protected, None)

    # Coerce types
    if "cgpa" in body and body["cgpa"] is not None:
        body["cgpa"] = float(body["cgpa"])
    if "backlogs" in body and body["backlogs"] is not None:
        body["backlogs"] = int(body["backlogs"])

    body["updated_at"] = datetime.utcnow()
    result = await db.students().update_one({"usn": student["usn"]}, {"$set": body})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Student not found")

    updated = await db.students().find_one({"usn": student["usn"]})
    return {"message": "Profile updated", "student": _strip(updated)}


# ── Placement Score ────────────────────────────────────────────────────────────
@router.post("/calculate-score")
async def calculate_score(student_jwt: dict = Depends(get_current_student)):
    student = await db.students().find_one({"usn": student_jwt["usn"]})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    try:
        import joblib
        import numpy as np
        model = joblib.load(str(ML_MODEL_PATH))

        cgpa = float(student.get("cgpa") or 6.0)
        backlogs = int(student.get("backlogs") or 0)
        skills = len(student.get("skills", []))
        projects = len(student.get("projects", []))
        experiences = len(student.get("experiences", []))

        features = np.array([[cgpa, backlogs, skills, projects, experiences]])
        prediction = model.predict_proba(features)[0]
        score = round(float(prediction[1]) * 100, 1)

    except Exception as e:
        # Fallback: rule-based score
        cgpa = float(student.get("cgpa") or 0)
        backlogs = int(student.get("backlogs") or 0)
        skills = len(student.get("skills", []))
        projects = len(student.get("projects", []))
        experiences = len(student.get("experiences", []))

        score_raw = (
            min(cgpa / 10 * 40, 40) +
            max(0, 20 - backlogs * 5) +
            min(skills * 2, 20) +
            min(projects * 3, 12) +
            min(experiences * 4, 8)
        )
        score = round(min(score_raw, 100), 1)

    # Determine label
    if score >= 75:
        label = "High Placement Potential 🚀"
    elif score >= 50:
        label = "Moderate Placement Potential 📈"
    else:
        label = "Needs Improvement 📚"

    await db.students().update_one(
        {"usn": student_jwt["usn"]},
        {"$set": {"placement_readiness_score": score, "updated_at": datetime.utcnow()}},
    )

    return {
        "placement_score": score,
        "label": label,
        "factors": {
            "cgpa": student.get("cgpa"),
            "backlogs": student.get("backlogs"),
            "skills_count": len(student.get("skills", [])),
            "projects_count": len(student.get("projects", [])),
            "experiences_count": len(student.get("experiences", [])),
        },
    }


# ── Eligible Drives – CRITICAL lock_reason logic ───────────────────────────────
@router.get("/my-eligible-drives")
async def my_eligible_drives(student_jwt: dict = Depends(get_current_student)):
    student = await db.students().find_one({"usn": student_jwt["usn"]})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    drives = await db.drives().find(
        {"college_id": student.get("college_id"), "active": True}
    ).sort("created_at", -1).to_list(None)

    # Get all applications by this student
    my_apps = await db.applications().find({"usn": student["usn"]}).to_list(None)
    applied_drive_ids = {a["drive_id"] for a in my_apps}

    result = []
    for drive in drives:
        reasons: List[str] = []
        s_cgpa = student.get("cgpa")
        s_backlogs = student.get("backlogs")
        s_branch = student.get("branch", "")
        s_skills = set(s.lower() for s in student.get("skills", []))

        # CGPA check
        min_cgpa = drive.get("min_cgpa") or 0
        if min_cgpa > 0:
            if s_cgpa is None:
                reasons.append(f"CGPA not set (Required: {min_cgpa})")
            elif float(s_cgpa) < float(min_cgpa):
                reasons.append(f"Minimum CGPA {min_cgpa} required (Yours: {s_cgpa})")

        # Backlogs check
        max_backlogs = drive.get("max_backlogs")
        if max_backlogs is not None and int(max_backlogs) < 10:
            if s_backlogs is None:
                reasons.append(f"Backlogs not set (Max allowed: {max_backlogs})")
            elif int(s_backlogs) > int(max_backlogs):
                reasons.append(f"Too many backlogs: {s_backlogs} (Max allowed: {max_backlogs})")

        # Branch check
        eligible_branches = drive.get("eligible_branches", [])
        if eligible_branches and s_branch not in eligible_branches:
            reasons.append(f"Branch '{s_branch}' not in eligible list: {', '.join(eligible_branches)}")

        # Skills check – one entry per missing skill (up to 3)
        required_skills = drive.get("required_skills", [])
        if required_skills:
            required_lower = set(s.lower() for s in required_skills)
            missing = required_lower - s_skills
            for skill in list(missing)[:3]:
                reasons.append(f"Missing required skill: {skill.title()}")

        is_locked = len(reasons) > 0

        drive_data = {
            "drive_id": drive.get("drive_id"),
            "_id": drive.get("drive_id"),
            "company_name": drive.get("company_name"),
            "job_role": drive.get("job_role"),
            "package_ctc": drive.get("package_ctc"),
            "work_location": drive.get("work_location"),
            "job_description": drive.get("job_description", ""),
            "min_cgpa": drive.get("min_cgpa"),
            "max_backlogs": drive.get("max_backlogs"),
            "eligible_branches": drive.get("eligible_branches"),
            "required_skills": drive.get("required_skills"),
            "application_deadline": drive.get("application_deadline"),
            "drive_date_time": drive.get("drive_date_time"),
            "applicant_count": drive.get("applicant_count", 0),
            "eligible_count": drive.get("eligible_count", 0),
            "total_seats": drive.get("total_seats"),
            "logo_path": drive.get("logo_path"),
            "industry_category": drive.get("industry_category"),
            "is_locked": is_locked,
            "lock_reason": reasons,
            "already_applied": drive.get("drive_id") in applied_drive_ids,
        }
        result.append(drive_data)

    has_resume = bool(student.get("resume_url"))
    return {"drives": result, "total": len(result), "has_resume": has_resume}



# ── Apply to drive ─────────────────────────────────────────────────────────────
@router.post("/apply")
async def apply_to_drive(
    body: dict,
    background_tasks: BackgroundTasks,
    student_jwt: dict = Depends(get_current_student),
):
    drive_id = body.get("drive_id")
    if not drive_id:
        raise HTTPException(status_code=400, detail="drive_id is required")

    student = await db.students().find_one({"usn": student_jwt["usn"]})
    drive = await db.drives().find_one({"drive_id": drive_id, "active": True})

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found or not active")

    # Check duplicate
    existing_app = await db.applications().find_one({"usn": student["usn"], "drive_id": drive_id})
    if existing_app:
        raise HTTPException(status_code=409, detail="You have already applied to this drive")

    # Server-side eligibility re-check
    if drive.get("min_cgpa") and student.get("cgpa") and student["cgpa"] < drive["min_cgpa"]:
        raise HTTPException(status_code=400, detail=f"CGPA {student['cgpa']} below required {drive['min_cgpa']}")
    if drive.get("max_backlogs") is not None and student.get("backlogs") is not None:
        if student["backlogs"] > drive["max_backlogs"]:
            raise HTTPException(status_code=400, detail=f"Too many backlogs ({student['backlogs']} > {drive['max_backlogs']})")

    # Use provided resume_url or student's saved one
    resume_url = body.get("resume_url") or student.get("resume_url") or ""

    application_id = str(uuid.uuid4())
    now = datetime.utcnow()
    app_doc = {
        "application_id": application_id,
        "usn": student["usn"],
        "drive_id": drive_id,
        "college_id": student.get("college_id"),
        "resume_url": resume_url,
        "ats_score": None,
        "status": "Applied",
        "applied_at": now,
        "updated_at": now,
    }
    await db.applications().insert_one(app_doc)

    # Increment drive applicant count
    await db.drives().update_one({"drive_id": drive_id}, {"$inc": {"applicant_count": 1}})

    # Background: calculate ATS score if resume available
    if resume_url and student.get("resume_url"):
        background_tasks.add_task(_calc_ats_background, application_id, resume_url, drive)

    return {"message": "Application submitted successfully!", "application_id": application_id}


async def _calc_ats_background(application_id: str, resume_url: str, drive: dict):
    """Background task to compute ATS score."""
    try:
        static_dir = Path(__file__).parent.parent / "static"
        filename = Path(resume_url).name
        filepath = static_dir / "resumes" / filename
        if filepath.exists():
            with open(filepath, "rb") as f:
                resume_text = extract_pdf_text_from_bytes(f.read())
            if resume_text:
                score = calculate_ats_score(resume_text, drive)
                await db.applications().update_one(
                    {"application_id": application_id},
                    {"$set": {"ats_score": score, "updated_at": datetime.utcnow()}},
                )
    except Exception as e:
        print(f"[ATS BG] Error calculating ATS for {application_id}: {e}")


# ── My applications ─────────────────────────────────────────────────────────────
@router.get("/my-applications")
async def my_applications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    student_jwt: dict = Depends(get_current_student),
):
    skip = paginate_skip(page, limit)
    total = await db.applications().count_documents({"usn": student_jwt["usn"]})
    apps = await db.applications().find({"usn": student_jwt["usn"]}).sort("applied_at", -1).skip(skip).limit(limit).to_list(None)

    enriched = []
    for app in apps:
        drive = await db.drives().find_one({"drive_id": app.get("drive_id")})
        if drive:
            enriched.append({
                "application_id": app.get("application_id"),
                "drive_id": app.get("drive_id"),
                "company_name": drive.get("company_name"),
                "job_role": drive.get("job_role"),
                "package_ctc": drive.get("package_ctc"),
                "work_location": drive.get("work_location"),
                "logo_path": drive.get("logo_path"),
                "status": app.get("status"),
                "ats_score": app.get("ats_score"),
                "applied_at": app.get("applied_at", "").isoformat() if isinstance(app.get("applied_at"), datetime) else app.get("applied_at"),
            })
    return {"applications": enriched, "total": total, "page": page, "pages": total_pages(total, limit)}


# ── Resume management ──────────────────────────────────────────────────────────
@router.post("/resume/upload")
async def upload_resume(
    file: UploadFile = File(...),
    student_jwt: dict = Depends(get_current_student),
):
    resume_url = await save_resume(file, student_jwt["usn"])
    await db.students().update_one(
        {"usn": student_jwt["usn"]},
        {"$set": {"resume_url": resume_url, "updated_at": datetime.utcnow()}},
    )
    return {"resume_url": resume_url, "message": "Resume uploaded successfully"}


@router.get("/resume")
async def get_resume(student_jwt: dict = Depends(get_current_student)):
    student = await db.students().find_one({"usn": student_jwt["usn"]})
    return {"resume_url": student.get("resume_url") if student else None}


@router.delete("/resume")
async def delete_resume_endpoint(student_jwt: dict = Depends(get_current_student)):
    student = await db.students().find_one({"usn": student_jwt["usn"]})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    resume_url = student.get("resume_url")
    if resume_url:
        delete_resume(resume_url)
    await db.students().update_one(
        {"usn": student_jwt["usn"]},
        {"$set": {"resume_url": None, "updated_at": datetime.utcnow()}},
    )
    return {"message": "Resume deleted"}


# ── ATS Resume Analysis ────────────────────────────────────────────────────────
@router.post("/analyze-resume")
async def analyze_resume(
    file: UploadFile = File(...),
    drive_id: str = Query(...),
    student_jwt: dict = Depends(get_current_student),
):
    drive = await db.drives().find_one({"drive_id": drive_id})
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    contents = await file.read()
    resume_text = extract_pdf_text_from_bytes(contents)
    if not resume_text:
        raise HTTPException(status_code=400, detail="Could not extract text from resume PDF")

    ats_score = calculate_ats_score(resume_text, drive)
    return {"ats_score": ats_score, "drive_id": drive_id, "company": drive.get("company_name")}


# ── Interview schedule ─────────────────────────────────────────────────────────
@router.get("/my-schedule")
async def my_schedule(student_jwt: dict = Depends(get_current_student)):
    usn = student_jwt["usn"]
    schedules = await db.interview_schedules().find({}).to_list(None)
    my_slots = []
    for sched in schedules:
        for slot in sched.get("slots", []):
            if slot.get("usn") == usn:
                drive = await db.drives().find_one({"drive_id": sched.get("drive_id")})
                my_slots.append({
                    "schedule_id": sched.get("schedule_id"),
                    "drive_id": sched.get("drive_id"),
                    "company_name": drive.get("company_name") if drive else "",
                    "time_slot": slot.get("time_slot"),
                    "duration_minutes": slot.get("duration_minutes", 30),
                    "panel": slot.get("panel"),
                })
    return {"schedule": my_slots}


# ── Notifications ──────────────────────────────────────────────────────────────
@router.get("/notifications")
async def get_notifications(
    unread_only: bool = Query(False),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    student_jwt: dict = Depends(get_current_student),
):
    query: dict = {"recipient_usn": student_jwt["usn"]}
    if unread_only:
        query["is_read"] = False

    skip = paginate_skip(page, limit)
    total = await db.notifications().count_documents(query)
    docs = await db.notifications().find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(None)
    for d in docs:
        d.pop("_id", None)
    return {"notifications": docs, "total": total, "page": page, "pages": total_pages(total, limit)}


@router.put("/notifications/read")
async def mark_notification_read(body: dict, student_jwt: dict = Depends(get_current_student)):
    notif_id = body.get("notification_id")
    if not notif_id:
        raise HTTPException(status_code=400, detail="notification_id is required")
    result = await db.notifications().update_one(
        {"notification_id": notif_id, "recipient_usn": student_jwt["usn"]},
        {"$set": {"is_read": True}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read"}


# ── Drive match (ATS score for a specific drive) ───────────────────────────────
@router.get("/drive-match/{drive_id}")
async def drive_match(drive_id: str, student_jwt: dict = Depends(get_current_student)):
    student = await db.students().find_one({"usn": student_jwt["usn"]})
    drive = await db.drives().find_one({"drive_id": drive_id})
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
    if not student or not student.get("resume_url"):
        return {"ats_score": None, "message": "Upload your resume first to see the ATS score"}

    static_dir = Path(__file__).parent.parent / "static"
    filename = Path(student["resume_url"]).name
    filepath = static_dir / "resumes" / filename
    if not filepath.exists():
        return {"ats_score": None, "message": "Resume file not found on server"}

    with open(filepath, "rb") as f:
        resume_text = extract_pdf_text_from_bytes(f.read())

    ats_score = calculate_ats_score(resume_text, drive)
    return {"ats_score": ats_score, "drive_id": drive_id}
