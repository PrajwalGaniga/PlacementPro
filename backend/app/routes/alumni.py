"""
alumni.py – Alumni Connect Portal V2
Collections: alumni, alumni_jobs, alumni_sessions, session_applications
STRICTLY ADDITIVE – does NOT touch any existing route files.
"""
from __future__ import annotations

import hashlib
import os
from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from app.utils.student_auth import get_current_student
from app.database import get_db
from app.utils.auth import get_current_user

# ─── Templates ───────────────────────────────────────────────────────────────
_TMPL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "templates", "alumni")
templates = Jinja2Templates(directory=_TMPL_DIR)

# ─── Routers ─────────────────────────────────────────────────────────────────
router               = APIRouter(prefix="/alumni",   tags=["Alumni"])
admin_alumni         = APIRouter(prefix="/admin",    tags=["Admin–Alumni"])
student_alumni_router = APIRouter(prefix="/student", tags=["Student–Alumni"])

# ─── Helpers ─────────────────────────────────────────────────────────────────
def _hash(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def _oid(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

def _str_ids(doc: dict, *fields) -> dict:
    for f in fields:
        if f in doc and isinstance(doc[f], ObjectId):
            doc[f] = str(doc[f])
    return doc

async def _session_alumni(request: Request):
    db = get_db()
    aid = request.cookies.get("alumni_id")
    if not aid:
        return None
    try:
        return await db["alumni"].find_one({"_id": ObjectId(aid)})
    except Exception:
        return None

# ─── Pydantic Models ─────────────────────────────────────────────────────────
class AlumniRegister(BaseModel):
    name: str
    email: str
    password: str
    graduation_year: int
    branch: str
    current_company: str
    job_title: str
    linkedin_url: str = ""

class AlumniLogin(BaseModel):
    email: str
    password: str

class AlumniFullProfile(BaseModel):
    name: str = ""
    current_company: str = ""
    job_title: str = ""
    linkedin_url: str = ""
    github_url: str = ""
    bio: str = ""
    skills: list[str] = []

class JobPost(BaseModel):
    company_name: str
    role: str
    description: str
    apply_link_or_email: str

class SessionPost(BaseModel):
    session_type: str          # "Mock Interview" | "Career Guidance"
    description: str
    is_paid: bool = False
    price: float = 0.0

class SessionToggle(BaseModel):
    is_active: bool

class ScheduleApp(BaseModel):
    scheduled_date: str
    scheduled_time: str
    meeting_link: str

class FeedbackPayload(BaseModel):
    alumni_rating: int          # 1-5
    alumni_remarks: str

class StudentApply(BaseModel):
    session_id: str

# ═════════════════════════════════════════════════════════════════════════════
# SECTION A – Jinja2 Page Routes
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/login", response_class=HTMLResponse)
async def p_login(request: Request):
    return templates.TemplateResponse("alumni_login.html", {"request": request})

@router.get("/onboard", response_class=HTMLResponse)
@router.get("/register", response_class=HTMLResponse)
async def p_onboard(request: Request):
    return templates.TemplateResponse("alumni_onboard.html", {"request": request})

@router.get("/verification", response_class=HTMLResponse)
@router.get("/pending",      response_class=HTMLResponse)
async def p_verification(request: Request):
    alum = await _session_alumni(request)
    status = (alum or {}).get("verification_status", "Pending")
    return templates.TemplateResponse("alumni_verification.html", {
        "request": request, "status": status,
        "alumni": _oid(dict(alum)) if alum else None,
    })

@router.get("/profile", response_class=HTMLResponse)
async def p_profile(request: Request):
    alum = await _session_alumni(request)
    if not alum:
        return RedirectResponse("/alumni/login")
    return templates.TemplateResponse("alumni_profile.html", {
        "request": request, "alumni": _oid(dict(alum)),
    })

@router.get("/dashboard", response_class=HTMLResponse)
async def p_dashboard(request: Request):
    alum = await _session_alumni(request)
    if not alum:
        return RedirectResponse("/alumni/login")
    if alum.get("verification_status") != "Verified":
        return RedirectResponse("/alumni/verification")
    db = get_db()
    aid = alum["_id"]

    # Jobs feed (community)
    all_jobs = []
    async for j in db["alumni_jobs"].find({}).sort("posted_at", -1).limit(30):
        j["_id"] = str(j["_id"]); j["alumni_id"] = str(j["alumni_id"])
        j["is_mine"] = (j["alumni_id"] == str(aid))
        all_jobs.append(j)

    # My sessions
    my_sessions = []
    async for s in db["alumni_sessions"].find({"alumni_id": aid}):
        s["_id"] = str(s["_id"]); s["alumni_id"] = str(s["alumni_id"])
        # Count applicants
        s["applicant_count"] = await db["session_applications"].count_documents(
            {"session_id": ObjectId(s["_id"])}
        )
        my_sessions.append(s)

    # Applicants for this alumni's sessions (all)
    applicants = []
    session_ids = [ObjectId(s["_id"]) for s in my_sessions]
    if session_ids:
        async for app in db["session_applications"].find({"session_id": {"$in": session_ids}}):
            app["_id"] = str(app["_id"])
            app["session_id"] = str(app["session_id"])
            # Enrich with session info
            sess = next((s for s in my_sessions if s["_id"] == app["session_id"]), None)
            app["session_type"] = sess["session_type"] if sess else "—"
            applicants.append(app)

    return templates.TemplateResponse("alumni_dashboard.html", {
        "request": request,
        "alumni": _oid(dict(alum)),
        "all_jobs": all_jobs,
        "my_sessions": my_sessions,
        "applicants": applicants,
    })

# ═════════════════════════════════════════════════════════════════════════════
# SECTION B – Auth API
# ═════════════════════════════════════════════════════════════════════════════

@router.post("/register")
async def api_register(payload: AlumniRegister):
    db = get_db()
    if await db["alumni"].find_one({"email": payload.email}):
        raise HTTPException(400, "Email already registered")
    doc = payload.model_dump()
    doc["password_hash"] = _hash(doc.pop("password"))
    doc["verification_status"] = "Pending"
    doc["registered_at"] = datetime.utcnow().isoformat()
    doc["bio"] = ""; doc["skills"] = []; doc["github_url"] = ""
    r = await db["alumni"].insert_one(doc)
    return {"alumni_id": str(r.inserted_id)}

@router.post("/login")
async def api_login(payload: AlumniLogin):
    db = get_db()
    alum = await db["alumni"].find_one({
        "email": payload.email,
        "password_hash": _hash(payload.password)
    })
    if not alum:
        raise HTTPException(401, "Invalid credentials")
    resp = RedirectResponse("/alumni/dashboard", status_code=302)
    resp.set_cookie("alumni_id", str(alum["_id"]), max_age=86400 * 7, httponly=True)
    return resp

@router.post("/logout")
async def api_logout():
    resp = RedirectResponse("/alumni/login", status_code=302)
    resp.delete_cookie("alumni_id")
    return resp

# ═════════════════════════════════════════════════════════════════════════════
# SECTION C – Profile Update
# ═════════════════════════════════════════════════════════════════════════════

@router.put("/profile")
async def api_update_profile(payload: AlumniFullProfile, request: Request):
    alum = await _session_alumni(request)
    if not alum:
        raise HTTPException(401, "Not authenticated")
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    await get_db()["alumni"].update_one({"_id": alum["_id"]}, {"$set": update})
    return {"message": "Profile updated"}

# ═════════════════════════════════════════════════════════════════════════════
# SECTION D – Jobs (Passive Referral Board)
# ═════════════════════════════════════════════════════════════════════════════

@router.post("/jobs")
async def api_post_job(payload: JobPost, request: Request):
    alum = await _session_alumni(request)
    if not alum:
        raise HTTPException(401, "Not authenticated")
    if alum.get("verification_status") != "Verified":
        raise HTTPException(403, "Not verified")
    doc = payload.model_dump()
    doc.update({"alumni_id": alum["_id"], "alumni_name": alum["name"],
                "posted_at": datetime.utcnow().isoformat()})
    r = await get_db()["alumni_jobs"].insert_one(doc)
    return {"job_id": str(r.inserted_id)}

@router.delete("/jobs/{job_id}")
async def api_delete_job(job_id: str, request: Request):
    alum = await _session_alumni(request)
    if not alum:
        raise HTTPException(401, "Not authenticated")
    await get_db()["alumni_jobs"].delete_one(
        {"_id": ObjectId(job_id), "alumni_id": alum["_id"]}
    )
    return {"message": "Deleted"}

# ═════════════════════════════════════════════════════════════════════════════
# SECTION E – Sessions (Interactive Offerings)
# ═════════════════════════════════════════════════════════════════════════════

@router.post("/sessions")
async def api_create_session(payload: SessionPost, request: Request):
    alum = await _session_alumni(request)
    if not alum:
        raise HTTPException(401, "Not authenticated")
    if alum.get("verification_status") != "Verified":
        raise HTTPException(403, "Not verified")
    doc = payload.model_dump()
    doc.update({
        "alumni_id": alum["_id"],
        "alumni_name": alum["name"],
        "alumni_company": alum.get("current_company", ""),
        "alumni_title": alum.get("job_title", ""),
        "is_active": True,
        "posted_at": datetime.utcnow().isoformat(),
    })
    r = await get_db()["alumni_sessions"].insert_one(doc)
    return {"session_id": str(r.inserted_id)}

@router.put("/sessions/{session_id}/toggle")
async def api_toggle_session(session_id: str, payload: SessionToggle, request: Request):
    alum = await _session_alumni(request)
    if not alum:
        raise HTTPException(401, "Not authenticated")
    await get_db()["alumni_sessions"].update_one(
        {"_id": ObjectId(session_id), "alumni_id": alum["_id"]},
        {"$set": {"is_active": payload.is_active}}
    )
    return {"message": "Updated"}

@router.delete("/sessions/{session_id}")
async def api_delete_session(session_id: str, request: Request):
    alum = await _session_alumni(request)
    if not alum:
        raise HTTPException(401, "Not authenticated")
    db = get_db()
    await db["alumni_sessions"].delete_one(
        {"_id": ObjectId(session_id), "alumni_id": alum["_id"]}
    )
    await db["session_applications"].delete_many({"session_id": ObjectId(session_id)})
    return {"message": "Session and applications deleted"}

# ═════════════════════════════════════════════════════════════════════════════
# SECTION F – Applicant Manager (Schedule + Feedback)
# ═════════════════════════════════════════════════════════════════════════════

@router.put("/applications/{app_id}/schedule")
async def api_schedule(app_id: str, payload: ScheduleApp, request: Request):
    alum = await _session_alumni(request)
    if not alum:
        raise HTTPException(401, "Not authenticated")
    result = await get_db()["session_applications"].update_one(
        {"_id": ObjectId(app_id), "alumni_id": alum["_id"]},
        {"$set": {
            "status":           "Scheduled",
            "scheduled_date":   payload.scheduled_date,
            "scheduled_time":   payload.scheduled_time,
            "meeting_link":     payload.meeting_link,
            "scheduled_at":     datetime.utcnow().isoformat(),
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(404, "Application not found")
    return {"message": "Scheduled"}

@router.put("/applications/{app_id}/complete")
async def api_complete(app_id: str, payload: FeedbackPayload, request: Request):
    alum = await _session_alumni(request)
    if not alum:
        raise HTTPException(401, "Not authenticated")
    if not 1 <= payload.alumni_rating <= 5:
        raise HTTPException(400, "Rating must be 1-5")
    result = await get_db()["session_applications"].update_one(
        {"_id": ObjectId(app_id), "alumni_id": alum["_id"]},
        {"$set": {
            "status":          "Completed",
            "alumni_rating":   payload.alumni_rating,
            "alumni_remarks":  payload.alumni_remarks,
            "completed_at":    datetime.utcnow().isoformat(),
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(404, "Application not found")
    return {"message": "Marked complete with feedback"}

# ═════════════════════════════════════════════════════════════════════════════
# SECTION G – Student-Facing Endpoints
# ═════════════════════════════════════════════════════════════════════════════

@student_alumni_router.get("/alumni-jobs")
async def s_jobs(current_student: dict = Depends(get_current_student)):
    db = get_db()
    result = []
    async for j in db["alumni_jobs"].find({}).sort("posted_at", -1):
        j["_id"] = str(j["_id"]); j["alumni_id"] = str(j["alumni_id"])
        result.append(j)
    return result

@student_alumni_router.get("/alumni-sessions")
async def s_sessions(current_student: dict = Depends(get_current_student)):
    """Active session offerings by verified alumni."""
    db = get_db()
    result = []
    async for s in db["alumni_sessions"].find({"is_active": True}).sort("posted_at", -1):
        s["_id"] = str(s["_id"]); s["alumni_id"] = str(s["alumni_id"])
        result.append(s)
    return result

@student_alumni_router.post("/alumni-sessions/apply")
async def s_apply(payload: StudentApply, current_student: dict = Depends(get_current_student)):
    db = get_db()
    usn = current_student.get("usn")
    if not usn:
        raise HTTPException(401, "Not authenticated")
    # Check session exists and is active
    sess = await db["alumni_sessions"].find_one({"_id": ObjectId(payload.session_id), "is_active": True})
    if not sess:
        raise HTTPException(404, "Session not found or no longer active")
    # Prevent duplicate
    existing = await db["session_applications"].find_one({
        "session_id": ObjectId(payload.session_id),
        "student_usn": usn,
    })
    if existing:
        raise HTTPException(400, "You already applied to this session")
    doc = {
        "session_id":   ObjectId(payload.session_id),
        "alumni_id":    sess["alumni_id"],
        "student_usn":  usn,
        "student_name": current_student.get("name", ""),
        "status":       "Applied",
        "scheduled_date":  "",
        "scheduled_time":  "",
        "meeting_link":    "",
        "alumni_rating":   None,
        "alumni_remarks":  "",
        "applied_at":   datetime.utcnow().isoformat(),
    }
    r = await db["session_applications"].insert_one(doc)
    return {"application_id": str(r.inserted_id), "message": "Applied!"}

@student_alumni_router.get("/my-sessions")
async def s_my_sessions(current_student: dict = Depends(get_current_student)):
    """Student's session applications with full status + feedback."""
    db = get_db()
    usn = current_student.get("usn")
    result = []
    async for app in db["session_applications"].find({"student_usn": usn}).sort("applied_at", -1):
        app["_id"]        = str(app["_id"])
        app["session_id"] = str(app["session_id"])
        app["alumni_id"]  = str(app["alumni_id"])
        # Enrich with session + alumni info
        sess  = await db["alumni_sessions"].find_one({"_id": ObjectId(app["session_id"])})
        alum  = await db["alumni"].find_one({"_id": ObjectId(app["alumni_id"])})
        app["session_type"]    = sess["session_type"]    if sess else "—"
        app["session_desc"]    = sess["description"]     if sess else ""
        app["is_paid"]         = sess.get("is_paid", False) if sess else False
        app["price"]           = sess.get("price", 0)    if sess else 0
        app["alumni_name"]     = alum["name"]            if alum else "—"
        app["alumni_company"]  = alum.get("current_company","") if alum else ""
        app["alumni_title"]    = alum.get("job_title","") if alum else ""
        result.append(app)
    return result

# ═════════════════════════════════════════════════════════════════════════════
# SECTION H – Admin Endpoints
# ═════════════════════════════════════════════════════════════════════════════

@admin_alumni.get("/alumni/pending")
async def a_pending():
    db = get_db()
    return [_oid(dict(a)) async for a in db["alumni"].find({"verification_status": "Pending"})]

@admin_alumni.get("/alumni/all")
async def a_all():
    db = get_db()
    result = []
    async for a in db["alumni"].find({}):
        a.pop("password_hash", None)
        result.append(_oid(dict(a)))
    return result

@admin_alumni.get("/alumni/{alumni_id}/detail")
async def a_detail(alumni_id: str):
    db = get_db()
    aid = ObjectId(alumni_id)
    jobs_count    = await db["alumni_jobs"].count_documents({"alumni_id": aid})
    sess_count    = await db["alumni_sessions"].count_documents({"alumni_id": aid})
    applicants    = []
    async for app in db["session_applications"].find({"alumni_id": aid}):
        app["_id"]        = str(app["_id"])
        app["session_id"] = str(app["session_id"])
        applicants.append(app)
    return {
        "jobs_count":      jobs_count,
        "sessions_count":  sess_count,
        "applicants":      applicants,
    }

@admin_alumni.put("/alumni/{alumni_id}/verify")
async def a_verify(alumni_id: str, action: str = "approve"):
    db = get_db()
    status = "Verified" if action == "approve" else "Rejected"
    r = await db["alumni"].update_one(
        {"_id": ObjectId(alumni_id)},
        {"$set": {"verification_status": status, "verified_at": datetime.utcnow().isoformat()}}
    )
    if r.modified_count == 0:
        raise HTTPException(404, "Alumni not found")
    return {"message": f"Alumni {status}"}

@admin_alumni.delete("/alumni/{alumni_id}")
async def a_revoke(alumni_id: str):
    await get_db()["alumni"].update_one(
        {"_id": ObjectId(alumni_id)},
        {"$set": {"verification_status": "Rejected"}}
    )
    return {"message": "Revoked"}

@admin_alumni.get("/alumni/stats")
async def a_stats():
    db = get_db()
    return {
        "total_verified":      await db["alumni"].count_documents({"verification_status": "Verified"}),
        "pending_verification":await db["alumni"].count_documents({"verification_status": "Pending"}),
        "total_jobs_posted":   await db["alumni_jobs"].count_documents({}),
        "total_sessions":      await db["alumni_sessions"].count_documents({}),
        "sessions_completed":  await db["session_applications"].count_documents({"status": "Completed"}),
    }
