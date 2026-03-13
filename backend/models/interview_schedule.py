"""models/interview_schedule.py"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class SlotModel(BaseModel):
    usn: str
    student_name: str
    time_slot: str           # ISO 8601 string for serialisation simplicity
    duration_minutes: int = 30
    panel_room: Optional[str] = None
    date_str: Optional[str] = None
    panel: Optional[str] = "Panel 1"


class InterviewScheduleModel(BaseModel):
    schedule_id: str
    drive_id: str
    slots: List[SlotModel] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    notified: bool = False
