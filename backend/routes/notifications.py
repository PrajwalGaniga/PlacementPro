"""
routes/notifications.py – Admin-facing notification endpoints.
"""

import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel

import database as db
from utils.auth_utils import require_tpo
from utils.email_service import send_drive_notification

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class BulkNotifyRequest(BaseModel):
    recipient_usns: List[str]
    title: str
    message: str
    type: str = "general"
    related_drive_id: Optional[str] = None


@router.post("/send")
async def send_notifications(body: BulkNotifyRequest, tpo: dict = Depends(require_tpo)):
    now = datetime.utcnow()
    docs = []
    for usn in body.recipient_usns:
        docs.append({
            "notification_id": str(uuid.uuid4()),
            "recipient_usn": usn.upper(),
            "title": body.title,
            "message": body.message,
            "type": body.type,
            "related_drive_id": body.related_drive_id,
            "is_read": False,
            "created_at": now,
        })
    if docs:
        await db.notifications().insert_many(docs)
    return {"message": f"Created {len(docs)} notifications", "notifications_created": len(docs)}


@router.post("/drive/{drive_id}/notify-eligible")
async def notify_eligible_students(
    drive_id: str,
    background_tasks: BackgroundTasks,
    tpo: dict = Depends(require_tpo),
):
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
    now = datetime.utcnow()
    docs = []
    for s in students:
        docs.append({
            "notification_id": str(uuid.uuid4()),
            "recipient_usn": s["usn"],
            "title": f"🎯 New Drive: {drive.get('company_name')} – {drive.get('job_role')}",
            "message": f"A new placement drive is open! {drive.get('company_name')} is hiring for {drive.get('job_role')}. Log in to apply.",
            "type": "drive_update",
            "related_drive_id": drive_id,
            "is_read": False,
            "created_at": now,
        })
        background_tasks.add_task(
            send_drive_notification,
            s.get("email", ""),
            s.get("name", ""),
            drive.get("company_name", ""),
            drive.get("job_role", ""),
        )

    if docs:
        await db.notifications().insert_many(docs)

    return {"message": f"Notified {len(docs)} eligible students", "students_notified": len(docs)}
