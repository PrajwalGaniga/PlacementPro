from pydantic import BaseModel
from typing import Optional, List


# ── 4-Category Drive Model ───────────────────────────────────────────────────

class Drive(BaseModel):
    college_id: str
    active: bool = True

    # ── Category 1: Who & Where ──────────────────────────────────────────────
    company_name: str
    logo_path: Optional[str] = None          # URL, e.g. http://localhost:8000/logos/uuid.png
    industry_category: Optional[str] = None  # e.g. "Fintech", "FAANG", "EdTech"
    work_location: Optional[str] = None      # "In-office" | "Remote" | "Hybrid"
    job_role: Optional[str] = None           # e.g. "SDE Intern", "Associate Analyst"

    # ── Category 2: Logistics ────────────────────────────────────────────────
    package_ctc: Optional[str] = None        # e.g. "12 LPA" or "8-10 LPA"
    bond_details: Optional[str] = None       # e.g. "No Bond" | "2-year agreement"
    drive_date_time: Optional[str] = None    # ISO datetime string or human-readable
    venue: Optional[str] = None              # Room number or virtual link
    application_deadline: Optional[str] = None

    # ── Category 3: Company Filters (Criteria Engine) ────────────────────────
    min_cgpa: float = 0.0
    max_backlogs: int = 0
    eligible_branches: List[str] = []
    target_batches: List[str] = []           # graduation years, e.g. ["2025", "2026"]
    gender_pref: Optional[str] = None        # "Any" | "Female Only" | "Male Only"
    required_skills: List[str] = []          # for resume match scoring

    # ── Category 4: College Add-ons ──────────────────────────────────────────
    required_certs: List[str] = []           # e.g. ["AWS Cloud Practitioner"]
    min_attendance_pct: float = 0.0          # e.g. 80.0
    min_mock_score: float = 0.0              # internal mock interview score threshold

    # Legacy compat (keep for old clients)
    description: Optional[str] = None


class EligibilityCheck(BaseModel):
    college_id: str
    min_cgpa: float = 0.0
    max_backlogs: int = 10
    eligible_branches: List[str] = []
    target_batches: List[str] = []           # filter by graduation_year strings
    gender_pref: Optional[str] = None
    min_attendance_pct: float = 0.0
    min_mock_score: float = 0.0


class NotifyRequest(BaseModel):
    drive_id: str
    college_id: str
