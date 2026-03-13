"""models/notification.py"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class NotificationModel(BaseModel):
    notification_id: str
    recipient_usn: str
    title: str
    message: str
    type: str = "general"   # drive_update | application_status | interview_slot | general
    related_drive_id: Optional[str] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
