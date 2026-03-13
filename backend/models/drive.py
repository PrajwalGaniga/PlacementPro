"""models/drive.py"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class DriveModel(BaseModel):
    drive_id: str
    college_id: str
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

    # Eligibility criteria
    min_cgpa: float = 0.0
    max_backlogs: int = 10
    eligible_branches: List[str] = []
    required_skills: List[str] = []
    graduation_years: List[int] = []
    target_batches: List[str] = []

    # Drive metadata
    drive_date: Optional[str] = None
    drive_date_time: Optional[str] = None
    application_deadline: Optional[str] = None
    total_seats: Optional[int] = None
    active: bool = True
    applicant_count: int = 0
    eligible_count: int = 0

    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str = ""
