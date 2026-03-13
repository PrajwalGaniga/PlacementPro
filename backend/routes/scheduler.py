"""
routes/scheduler.py – AI Interview Scheduler.
"""

import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks

import database as db
from utils.auth_utils import require_tpo
from utils.gemini_interface import smart_sort_applicants
from utils.email_service import send_interview_slot

router = APIRouter(prefix="/scheduler", tags=["Scheduler"])


class DateWindow(BaseModel):
    date: str            # e.g. "2025-05-10"
    start_time: str      # e.g. "09:00"
    end_time: str        # e.g. "17:00"
    panel: Optional[str] = "Panel 1"


class SchedulerRequest(BaseModel):
    drive_id: str
    date_windows: List[DateWindow]
    slot_duration_minutes: int = 30
    num_panels: int = 1


@router.post("/generate")
async def generate_schedule(body: SchedulerRequest, tpo: dict = Depends(require_tpo)):
    drive = await db.drives().find_one({"drive_id": body.drive_id, "college_id": tpo.get("college_id")})
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    # Get shortlisted applicants (not rejected)
    apps = await db.applications().find(
        {"drive_id": body.drive_id, "status": {"$nin": ["Rejected"]}}
    ).to_list(None)

    if not apps:
        return {
            "schedule_id": str(uuid.uuid4()),
            "drive_id": body.drive_id,
            "slots": [],
            "total_slots": 0,
            "message": "No applicants found for this drive. Cannot generate schedule.",
        }

    # Enrich with student data
    enriched = []
    for app in apps:
        student = await db.students().find_one({"usn": app["usn"]})
        if student:
            enriched.append({
                "usn": app["usn"],
                "name": student.get("name", ""),
                "cgpa": student.get("cgpa") or 0,
                "skills": student.get("skills", []),
                "ats_score": app.get("ats_score") or 0,
                "status": app.get("status"),
            })

    # AI sort by relevance
    sorted_applicants = smart_sort_applicants(enriched, drive)

    # Generate time slots
    slots = []
    slot_idx = 0
    panel_labels = [f"Panel {i+1}" for i in range(max(body.num_panels, 1))]

    for window in body.date_windows:
        try:
            current_time = datetime.strptime(f"{window.date} {window.start_time}", "%Y-%m-%d %H:%M")
            end_time = datetime.strptime(f"{window.date} {window.end_time}", "%Y-%m-%d %H:%M")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid date/time format: {e}")

        panel_idx = 0
        while current_time < end_time and slot_idx < len(sorted_applicants):
            applicant = sorted_applicants[slot_idx]
            panel = panel_labels[panel_idx % len(panel_labels)]
            slots.append({
                "usn": applicant["usn"],
                "student_name": applicant["name"],
                "time_slot": current_time.isoformat(),
                "duration_minutes": body.slot_duration_minutes,
                "panel": panel,
                "panel_room": panel,
                "date_str": window.date,
            })
            current_time += timedelta(minutes=body.slot_duration_minutes)
            panel_idx += 1
            slot_idx += 1

    schedule_id = str(uuid.uuid4())
    now = datetime.utcnow()

    # Delete old schedule for this drive if exists
    await db.interview_schedules().delete_one({"drive_id": body.drive_id})

    await db.interview_schedules().insert_one({
        "schedule_id": schedule_id,
        "drive_id": body.drive_id,
        "slots": slots,
        "created_at": now,
        "notified": False,
    })

    return {
        "schedule_id": schedule_id,
        "drive_id": body.drive_id,
        "slots": slots,
        "total_slots": len(slots),
        "message": f"Schedule generated for {len(slots)} students across {len(body.date_windows)} day(s).",
    }


@router.get("/{drive_id}")
async def get_schedule(drive_id: str, tpo: dict = Depends(require_tpo)):
    sched = await db.interview_schedules().find_one({"drive_id": drive_id})
    if not sched:
        raise HTTPException(status_code=404, detail="No schedule found for this drive")
    sched.pop("_id", None)
    return {"schedule": sched}


@router.put("/{drive_id}/update")
async def update_schedule(drive_id: str, body: dict, tpo: dict = Depends(require_tpo)):
    slots = body.get("slots")
    if not slots:
        raise HTTPException(status_code=400, detail="slots array required")
    result = await db.interview_schedules().update_one(
        {"drive_id": drive_id},
        {"$set": {"slots": slots, "updated_at": datetime.utcnow()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"message": "Schedule updated"}


@router.post("/{drive_id}/notify")
async def notify_schedule(
    drive_id: str,
    background_tasks: BackgroundTasks,
    test_mode: bool = Query(True, description="If true, only sends to developer test emails"),
    tpo: dict = Depends(require_tpo),
):
    sched = await db.interview_schedules().find_one({"drive_id": drive_id})
    if not sched:
        raise HTTPException(status_code=404, detail="No schedule found")

    drive = await db.drives().find_one({"drive_id": drive_id})
    company = drive.get("company_name", "Company") if drive else "Company"

    count = 0
    for slot in sched.get("slots", []):
        student = await db.students().find_one({"usn": slot["usn"]})
        if not student:
            continue

        # Create in-app notification
        await db.notifications().insert_one({
            "notification_id": str(uuid.uuid4()),
            "recipient_usn": slot["usn"],
            "title": f"📅 Interview Scheduled – {company}",
            "message": f"Your interview with {company} is on {slot.get('date_str', '')} at {slot.get('time_slot', '')} ({slot.get('panel', '')}). Duration: {slot.get('duration_minutes', 30)} minutes.",
            "type": "interview_slot",
            "related_drive_id": drive_id,
            "is_read": False,
            "created_at": datetime.utcnow(),
        })

        # Email in background (Dual Mode logic)
        email = student.get("email", "").lower()
        allowed_test_emails = {
            "prajwalganiga06@gmail.com",
            "sanvi.s.shetty18@gmail.com",
            "varshiniganiga35@gmail.com",
            "ishwarya9448@gmail.com"
        }
        
        should_send = True
        if test_mode and email not in allowed_test_emails:
            should_send = False
            
        if should_send:
            background_tasks.add_task(
                send_interview_slot,
                student.get("email", ""),
                student.get("name", ""),
                company,
                slot.get("time_slot", ""),
                slot.get("panel"),
                slot.get("duration_minutes", 30),
            )
            count += 1

    await db.interview_schedules().update_one({"drive_id": drive_id}, {"$set": {"notified": True}})
    return {"message": f"Notified {count} students", "emails_sent": count}
