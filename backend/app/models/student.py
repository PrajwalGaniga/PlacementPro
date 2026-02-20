from pydantic import BaseModel, field_validator
from typing import Optional


class Student(BaseModel):
    college_id: str
    name: str
    email: str
    branch: str
    cgpa: float
    backlogs: int = 0
    placed: bool = False
    joining_year: int = 2022
    graduation_year: int = 2025
    usn: Optional[str] = None
    gender: Optional[str] = None          # "Male" | "Female" | "Other"
    skills: list[str] = []
    attendance_pct: float = 75.0
    mock_score: float = 0.0
    certifications: list[str] = []

    @property
    def batch_label(self) -> str:
        """e.g. 2025 → '2024-25', 2026 → '2025-26'"""
        return f"{self.graduation_year - 1}-{str(self.graduation_year)[2:]}"
    
from pydantic import BaseModel
from typing import List, Optional

class Experience(BaseModel):
    role: str
    company: str
    duration: str
    achievements: List[str]

class Project(BaseModel):
    name: str
    description: List[str]

class Education(BaseModel):
    degree: str
    institution: str
    score: str
    years: str

class StudentProfile(BaseModel):
    phone: Optional[str] = None
    portfolio_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    summary: Optional[str] = None
    experience: List[Experience] = []
    projects: List[Project] = []
    education: List[Education] = []
    soft_skills: List[str] = []
    awards: List[str] = []

# Update your main Student class to include this:
# profile: StudentProfile = StudentProfile()
