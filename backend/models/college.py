"""models/college.py"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class CollegeModel(BaseModel):
    college_id: str
    name: str
    place: str
    state: str
    country: str = "India"
    logo_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
