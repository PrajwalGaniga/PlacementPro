"""models/student.py"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class ProjectModel(BaseModel):
    title: str
    description: str = ""
    tech_stack: List[str] = []
    github_url: Optional[str] = None


class ExperienceModel(BaseModel):
    company: str
    role: str
    duration: str
    description: str = ""


class EducationModel(BaseModel):
    degree: str
    institution: str
    year: int
    percentage: float = 0.0


class StudentModel(BaseModel):
    usn: str
    email: str
    name: str
    college_id: str
    branch: str
    password_hash: str

    # Contact / profile
    phone: Optional[str] = None
    cgpa: Optional[float] = None
    backlogs: Optional[int] = None
    graduation_year: Optional[int] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None
    resume_url: Optional[str] = None
    placement_readiness_score: Optional[float] = None
    placed: bool = False
    placed_company: Optional[str] = None
    placed_package: Optional[str] = None

    # Nested
    skills: List[str] = []
    projects: List[ProjectModel] = []
    experiences: List[ExperienceModel] = []
    education: List[EducationModel] = []

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
