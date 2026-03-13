"""models/application.py"""
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field

ApplicationStatus = Literal["Applied", "Shortlisted", "Panel 1", "Selected", "Rejected"]


class ApplicationModel(BaseModel):
    application_id: str
    usn: str
    drive_id: str
    resume_url: str = ""
    ats_score: Optional[float] = None
    status: str = "Applied"
    applied_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
