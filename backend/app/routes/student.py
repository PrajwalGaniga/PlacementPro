import os, uuid, traceback
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from app.database import get_db
from app.utils.auth import get_current_user
from app.utils.student_auth import get_current_student
from app.utils.jwt_handler import create_access_token
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/student", tags=["Student"])

PROFILE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "student-profiles")
os.makedirs(PROFILE_DIR, exist_ok=True)

# ── JSON Skill Scorer (Rule-Based, No ML) ─────────────────────────────────────

_HIGH_DEMAND = {
    'python','java','javascript','typescript','react','angular','vue','node.js',
    'sql','mongodb','postgresql','aws','gcp','azure','docker','kubernetes',
    'machine learning','deep learning','ai','data science','nlp','flutter',
    'django','fastapi','spring','c++','c#','kotlin','swift','go','rust','git',
    'devops','linux','rest api','graphql','redis','elasticsearch'
}

def _json_score(student: dict) -> tuple:
    score = 0.0
    try:
        cgpa = float(student.get('cgpa') or 0)
        score += min((cgpa / 10.0) * 30, 30)
    except: pass

    skills = [s.lower().strip() for s in student.get('skills', [])]
    matched = sum(1 for s in skills if s in _HIGH_DEMAND)
    score += min(matched * 3, 25)

    score += min(len(student.get('experience', [])) * 7, 20)
    score += min(len(student.get('projects', [])) * 5, 15)

    edu = student.get('education', [])
    score += 10 if len(edu) >= 2 else (5 if len(edu) == 1 else 0)

    final = round(min(score, 100), 1)
    label = "High Readiness" if final >= 75 else "Moderate Readiness" if final >= 50 else "Developing"
    return final, label


# ── Pydantic Schemas ───────────────────────────────────────────────────────────

class StudentLogin(BaseModel):
    usn: str
    college_id: str

class ScoreRequest(BaseModel):
    usn: str
    internships: int = 0
    projects: int = 0
    age: int = 21

class ApplyRequest(BaseModel):
    drive_id: str
    college_id: Optional[str] = None
    resume_url: Optional[str] = None

class ExperienceEntry(BaseModel):
    role: str = ""
    company: str = ""
    duration: str = ""
    achievements: List[str] = []

class ProjectEntry(BaseModel):
    name: str = ""
    description: List[str] = []

class EducationEntry(BaseModel):
    degree: str = ""
    institution: str = ""
    score: str = ""
    years: str = ""

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    cgpa: Optional[str] = None
    branch: Optional[str] = None
    linkedin_url: Optional[str] = None
    summary: Optional[str] = None
    skills: Optional[List[str]] = None
    experience: Optional[List[ExperienceEntry]] = None
    projects: Optional[List[ProjectEntry]] = None
    education: Optional[List[EducationEntry]] = None


# ── GET /student/colleges ─────────────────────────────────────────────────────

@router.get("/colleges")
async def get_colleges():
    try:
        db = get_db()
        colleges = await db["colleges"].find({}, {"_id": 0}).to_list(length=100)
        if not colleges:
            demo = {"college_id": "COL123", "name": "Srinivas Institute of Technology"}
            await db["colleges"].insert_one(demo.copy())
            return [demo]
        return colleges
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch colleges: {e}")

# ── POST /student/login ───────────────────────────────────────────────────────

@router.post("/login")
async def student_login(payload: StudentLogin):
    try:
        db = get_db()
        student = await db["students"].find_one(
            {"usn": payload.usn.upper(), "college_id": payload.college_id},
            {"_id": 0}
        )
        if not student:
            if payload.usn.upper() in ("4SN23CS001", "4SN25CS001"):
                student = {
                    "usn": payload.usn.upper(), "college_id": payload.college_id,
                    "name": "Demo Student", "email": "demo@student.com",
                    "branch": "CSE", "cgpa": 8.5, "backlogs": 0,
                    "graduation_year": 2025, "skills": ["Python", "Flutter"],
                    "placed": False, "placement_score": None,
                }
                await db["students"].insert_one(student.copy())
            else:
                raise HTTPException(status_code=404, detail="Student not found. Check USN and college.")

        token = create_access_token({
            "sub": student.get("email", ""),
            "college_id": student.get("college_id"),
            "usn": student.get("usn"),
            "name": student.get("name"),
            "role": "student",
        })
        safe_fields = ["name","email","usn","branch","cgpa","graduation_year",
                       "placed","skills","placement_score","phone","linkedin_url","summary"]
        return {
            "access_token": token,
            "token_type": "bearer",
            "student": {k: student[k] for k in safe_fields if k in student},
        }
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {e}")


# ── POST /student/calculate-score ──────────────────────────────────────────────

@router.post("/calculate-score")
async def calculate_score(req: ScoreRequest, current_student: dict = Depends(get_current_student)):
    try:
        db = get_db()
        usn = current_student.get("usn") or req.usn
        student = await db["students"].find_one({"usn": usn}, {"_id": 0})
        if not student: raise HTTPException(status_code=404, detail="Student not found")

        score, label = _json_score(student)
        await db["students"].update_one(
            {"usn": usn},
            {"$set": {"placement_score": score, "score_label": label, "score_updated_at": datetime.utcnow().isoformat()}}
        )
        return {"usn": usn, "placement_score": score, "label": label}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Score failed: {e}")


# ── GET /student/my-eligible-drives (CRITICAL FIX FOR CRASH) ─────────────────

@router.get("/my-eligible-drives")
async def my_eligible_drives(current_student: dict = Depends(get_current_student)):
    print(f"\n[DEBUG-API] 🟡 Evaluating drives for USN: {current_student.get('usn')}")
    try:
        db = get_db()
        usn = current_student.get("usn")
        college_id = current_student.get("college_id")

        student = await db["students"].find_one({"usn": usn}, {"_id": 0})
        if not student: raise HTTPException(status_code=404, detail="Student profile not found")

        # 1. Fetch all drives the student has ALREADY applied to
        existing_apps = await db["applications"].find({"usn": usn}).to_list(1000)
        applied_drive_ids = {str(app["drive_id"]) for app in existing_apps}

        # 2. Safely Parse Student Data
        try: student_cgpa = float(student.get("cgpa") or 0)
        except ValueError: student_cgpa = 0.0

        try: student_backs = int(student.get("backlogs") or 0)
        except ValueError: student_backs = 0

        drives = await db["drives"].find({"college_id": college_id, "active": True}).to_list(200)
        
        eligible = []
        for drive in drives:
            drive["_id"] = str(drive["_id"])
            
            drive_cgpa = float(drive.get("min_cgpa") or 0)
            drive_backs = int(drive.get("max_backlogs") or 99)
            
            # ELIGIBILITY CHECKS
            if student_cgpa < drive_cgpa: continue
            if student_backs > drive_backs: continue
            
            branches = drive.get("eligible_branches") or drive.get("branches") or []
            if branches and student.get("branch") not in branches: continue
            
            batches = drive.get("target_batches", [])
            if batches and str(student.get("graduation_year", "")) not in [str(b) for b in batches]: continue
            
            # 🚨 THE FIX: Tell the frontend if they already applied!
            drive["_applied"] = drive["_id"] in applied_drive_ids
            drive["ai_summary"] = f"{drive.get('company_name','Company')} is hiring for {drive.get('job_role','Software Engineer')}."
            eligible.append(drive)

        print(f"[DEBUG-API] 🟢 Total eligible drives found: {len(eligible)}")
        return {"eligible_drives": eligible, "count": len(eligible), "student_name": student.get("name")}
    except Exception as e:
        print(f"[DEBUG-API] ❌ 500 ERROR in my-eligible-drives:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Feed failed: {e}")


# ── PUT /student/update-profile ────────────────────────────────────────────────

@router.put("/update-profile")
async def update_profile(payload: ProfileUpdate, current_student: dict = Depends(get_current_student)):
    try:
        db = get_db()
        usn = current_student.get("usn")
        update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}

        if "experience" in update_data:
            update_data["experience"] = [e if isinstance(e, dict) else e.model_dump() for e in update_data["experience"]]
        if "projects" in update_data:
            update_data["projects"] = [p if isinstance(p, dict) else p.model_dump() for p in update_data["projects"]]
        if "education" in update_data:
            update_data["education"] = [e if isinstance(e, dict) else e.model_dump() for e in update_data["education"]]

        # Clean string formats to numbers so our DB stays clean
        if "cgpa" in update_data:
            try: update_data["cgpa"] = float(update_data["cgpa"])
            except: pass

        update_data["updated_at"] = datetime.utcnow().isoformat()
        result = await db["students"].update_one({"usn": usn}, {"$set": update_data})
        if result.matched_count == 0: raise HTTPException(status_code=404, detail="Student not found")

        updated_student = await db["students"].find_one({"usn": usn}, {"_id": 0})
        score, label = _json_score(updated_student)
        await db["students"].update_one({"usn": usn}, {"$set": {"placement_score": score, "score_label": label}})

        return {"message": "Profile updated successfully!", "placement_score": score, "label": label}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update failed: {e}")


# ── MISSING TPO ENDPOINTS (CRITICAL FOR REACT DASHBOARD) ──────────────────────

@router.get("/list")
async def get_student_list(
    branch: Optional[str] = None,
    placed: Optional[bool] = None,
    graduation_year: Optional[int] = None,
    cgpa_min: Optional[float] = None,
    cgpa_max: Optional[float] = None,
    zero_backlogs: Optional[bool] = None,
    skills: Optional[str] = None,
    current_user: dict = Depends(get_current_user) # TPO authenticates here
):
    """Fetches all students for the TPO Dashboard with clean filtering"""
    print(f"\n[DEBUG-API] 🟡 Fetching student list for TPO...")
    try:
        db = get_db()
        query = {"college_id": current_user.get("college_id")}
        
        import re
        if branch and branch != "All": 
            branch_map = {
                "CSE": "Computer Science.*?Engineering|CSE",
                "ECE": "Electronics.*?Communication|ECE",
                "ME": "Mechanical|ME",
                "CE": "Civil|CE",
                "ISE": "Information Science|ISE",
                "AI": "Artificial Intelligence|AI|AIML",
            }
            # Attempt to use a mapped regex pattern if present, otherwise fallback to exact match pattern
            pattern = branch_map.get(branch.upper(), f"^{re.escape(branch)}$")
            query["branch"] = re.compile(pattern, re.IGNORECASE)
        if placed is not None: query["placed"] = placed
        if graduation_year: query["graduation_year"] = graduation_year
        
        if cgpa_min is not None or cgpa_max is not None:
            query["cgpa"] = {}
            if cgpa_min is not None: query["cgpa"]["$gte"] = cgpa_min
            if cgpa_max is not None: query["cgpa"]["$lte"] = cgpa_max
            
        if zero_backlogs: query["backlogs"] = 0
            
        if skills:
            skill_list = [s.strip() for s in skills.split(',')]
            # Use case-insensitive regex for array matching
            import re
            query["skills"] = {"$all": [re.compile(f"^{re.escape(s)}$", re.IGNORECASE) for s in skill_list]}

        students = await db["students"].find(query, {"_id": 0}).to_list(1000)
        print(f"[DEBUG-API] 🟢 Returning {len(students)} students to dashboard")
        return students
    except Exception as e:
        print(f"[DEBUG-API] ❌ List error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

import pandas as pd

@router.post("/import-students")
async def import_students(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Import students from Excel/CSV and forcefully bulk assign to the TPO's college_id"""
    print(f"\n[DEBUG-API] 🟡 Importing Students for TPO: {current_user.get('college_id')}...")
    try:
        if not file.filename.endswith((".xlsx", ".csv")):
            raise HTTPException(status_code=400, detail="Only .xlsx or .csv files are supported")
            
        content = await file.read()
        import io
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
            
        # Clean columns: lowercase and strip whitespace
        df.columns = [str(c).lower().strip() for c in df.columns]
        
        # Required minimal mapping
        db = get_db()
        college_id = current_user.get("college_id")
        
        students_to_insert = []
        for index, row in df.iterrows():
            usn = str(row.get("usn", f"UNKNOWN_{index}")).strip().upper()
            if not usn or pd.isna(usn) or usn == "NAN": continue
            
            # Use placeholders for missing data as requested by the user
            name = str(row.get("name", "Student Name"))
            if pd.isna(name): name = "Student Name"
            
            email = str(row.get("email", f"{usn}@student.com"))
            if pd.isna(email): email = f"{usn}@student.com"
            
            branch = str(row.get("branch", "General"))
            if pd.isna(branch): branch = "General"
            
            try: cgpa = float(row.get("cgpa", 0.0))
            except: cgpa = 0.0
            if pd.isna(cgpa): cgpa = 0.0
                
            try: backlogs = int(row.get("backlogs", 0))
            except: backlogs = 0
            if pd.isna(backlogs): backlogs = 0
                
            try: graduation_year = int(row.get("graduation_year", 2025))
            except: graduation_year = 2025
            if pd.isna(graduation_year): graduation_year = 2025
            
            skills_raw = str(row.get("skills", ""))
            skills = [s.strip().title() for s in skills_raw.split(",")] if skills_raw and not pd.isna(skills_raw) and skills_raw != "nan" else []
                
            student_doc = {
                "college_id": college_id, # Tenant override
                "usn": usn,
                "name": name,
                "email": email,
                "branch": branch.title(),
                "cgpa": cgpa,
                "backlogs": backlogs,
                "graduation_year": graduation_year,
                "placed": False,
                "skills": skills,
                "created_at": datetime.utcnow().isoformat()
            }
            students_to_insert.append(student_doc)
            
        if not students_to_insert:
            raise HTTPException(status_code=400, detail="No readable student rows found in file")
            
        # Optional: delete existing so it's a clean "dump", or Upsert. Assuming Dump for now to easily reset states
        # Bulk Upsert based on USN
        from pymongo import UpdateOne
        operations = [
            UpdateOne(
                {"usn": doc["usn"]}, 
                {"$set": doc},
                upsert=True
            ) for doc in students_to_insert
        ]
        
        result = await db["students"].bulk_write(operations)
        print(f"[DEBUG-API] 🟢 Inserted/Updated {len(operations)} students.")
        
        return {
            "message": f"Successfully imported {len(operations)} students",
            "inserted": result.upserted_count,
            "updated": result.modified_count
        }
            
    except Exception as e:
        print(f"[DEBUG-API] ❌ Import error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/batches")
async def get_batches(current_user: dict = Depends(get_current_user)):
    """Fetches distinct graduation years for the dropdown"""
    try:
        db = get_db()
        batches = await db["students"].distinct("graduation_year", {"college_id": current_user.get("college_id")})
        # Filter out None values and sort descending
        valid_batches = sorted([b for b in batches if b is not None], reverse=True)
        return valid_batches
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── OTHER ENDPOINTS (Apply, My Apps, Schedule, Upload Cert) ───────────────────

import shutil # Make sure this is at the top of your file!

@router.post("/apply")
async def apply_for_drive(req: ApplyRequest, current_student: dict = Depends(get_current_student)):
    try:
        db = get_db()
        usn = current_student.get("usn")
        
        existing = await db["applications"].find_one({"usn": usn, "drive_id": req.drive_id})
        if existing: return {"message": "Already applied!", "status": "Applied"}

        # ── HANDLE RESUME SAVING ──
        final_resume_url = None
        if req.resume_url:
            filename = req.resume_url.split("/")[-1]
            source_path = os.path.join(os.path.dirname(__file__), "..", "..", "drive-logos", filename)
            
            # Create submitted dir if it doesn't exist
            sub_dir = os.path.join(os.path.dirname(__file__), "..", "..", "submitted_resumes")
            os.makedirs(sub_dir, exist_ok=True)
            
            if os.path.exists(source_path):
                dest_filename = f"applied_{usn}_{filename}"
                dest_path = os.path.join(sub_dir, dest_filename)
                shutil.copy2(source_path, dest_path) # Copies the PDF!
                final_resume_url = f"http://localhost:8000/submitted_resumes/{dest_filename}"

        application = {
            "usn": usn, "student_name": current_student.get("name"), "email": current_student.get("sub"),
            "drive_id": req.drive_id, "college_id": req.college_id or current_student.get("college_id"),
            "status": "Applied", 
            "resume_url": final_resume_url, # Saves the local link!
            "timeline": [{"stage": "Applied", "timestamp": datetime.utcnow().isoformat()}],
            "applied_at": datetime.utcnow().isoformat(),
        }
        await db["applications"].insert_one(application)
        
        try:
            drive = await db["drives"].find_one({"_id": ObjectId(req.drive_id)})
            if drive:
                await db["applications"].update_one(
                    {"usn": usn, "drive_id": req.drive_id},
                    {"$set": {"company_name": drive.get("company_name", ""), "job_role": drive.get("job_role", "")}}
                )
                await db["drives"].update_one({"_id": ObjectId(req.drive_id)}, {"$addToSet": {"applied_students": usn}})
        except: pass

        return {"message": "Applied successfully!", "status": "Applied"}
    except Exception as e: raise HTTPException(status_code=500, detail=f"Apply failed: {e}")

@router.get("/my-applications")
async def my_applications(current_student: dict = Depends(get_current_student)):
    try:
        return await get_db()["applications"].find({"usn": current_student.get("usn")}, {"_id": 0}).to_list(100)
    except Exception as e: raise HTTPException(status_code=500, detail=f"Failed: {e}")

@router.get("/my-schedule")
async def my_schedule(current_student: dict = Depends(get_current_student)):
    try:
        db = get_db()
        apps = await db["applications"].find(
            {"usn": current_student.get("usn"), "status": {"$in": ["Shortlisted", "Panel 1", "Selected"]}}, {"_id": 0}
        ).to_list(50)
        schedule = [
            {
                "company_name": a.get("company_name", ""), "job_role": a.get("job_role", ""),
                "interview_date": a.get("interview_date"), "interview_time": a.get("interview_time", "TBD"),
                "venue": a.get("venue", "Online"), "status": a.get("status"),
            } for a in apps if a.get("interview_date")
        ]
        return {"schedule": schedule, "count": len(schedule)}
    except Exception as e: raise HTTPException(status_code=500, detail=f"Schedule failed: {e}")

import PyPDF2
import io
from fastapi import Form, File, UploadFile

# ── POST /student/analyze-resume ──────────────────────────────────────────────
@router.post("/analyze-resume")
async def analyze_resume(
    drive_id: str = Form(...),
    file: UploadFile = File(...),
    current_student: dict = Depends(get_current_student)
):
    """Mini-ATS: Compares an uploaded PDF resume against the Drive's required skills."""
    print(f"\n[DEBUG-API] 🟡 Analyzing Resume for Drive: {drive_id}")
    try:
        db = get_db()
        drive = await db["drives"].find_one({"_id": ObjectId(drive_id)})
        if not drive: 
            raise HTTPException(status_code=404, detail="Drive not found")

        # 1. Read PDF Text
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF resumes are supported.")
            
        pdf_bytes = await file.read()
        reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
        resume_text = " ".join(page.extract_text() or "" for page in reader.pages).lower()

        # 2. Extract Skills to Match
        required_skills = [s.strip().lower() for s in drive.get("required_skills", [])]
        
        # If the TPO didn't add any specific skills, give them a free pass!
        if not required_skills:
            return {
                "score": 100, 
                "matched": [], 
                "missing": [], 
                "message": "This drive has no specific skill requirements. You are good to go!"
            }

        # 3. Calculate Score
        matched = [s for s in required_skills if s in resume_text]
        missing = [s for s in required_skills if s not in resume_text]
        
        score = int((len(matched) / len(required_skills)) * 100)
        
        # Determine color/label for Flutter
        if score >= 80: readiness = "Excellent Match"
        elif score >= 50: readiness = "Good Match"
        else: readiness = "Needs Improvement"

        print(f"[DEBUG-API] 🟢 ATS Score: {score}% | Matched: {matched}")
        return {
            "score": score,
            "readiness": readiness,
            "matched": [s.title() for s in matched],
            "missing": [s.title() for s in missing],
            "message": f"Your resume matches {score}% of the required skills."
        }
    except Exception as e:
        print(f"[DEBUG-API] ❌ Resume Analysis Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze resume: {str(e)}")
    
@router.get("/drive-match/{drive_id}")
async def get_drive_match(drive_id: str, current_student: dict = Depends(get_current_student)):
    """Calculates ATS score between student's saved skills and drive requirements."""
    try:
        db = get_db()
        drive = await db["drives"].find_one({"_id": ObjectId(drive_id)})
        student = await db["students"].find_one({"usn": current_student.get("usn")})
        
        if not drive or not student: raise HTTPException(status_code=404, detail="Not found")
            
        req_skills = [s.strip().lower() for s in drive.get("required_skills", [])]
        stu_skills = [s.strip().lower() for s in student.get("skills", [])]
        
        if not req_skills:
            return {"score": 100, "matched": [], "missing": [], "readiness": "Perfect Match - No specific skills required."}
            
        matched = [s for s in req_skills if s in stu_skills]
        missing = [s for s in req_skills if s not in stu_skills]
        
        score = int((len(matched) / len(req_skills)) * 100) if req_skills else 100
        readiness = "Excellent Match" if score >= 80 else "Good Match" if score >= 50 else "Needs Improvement"
        
        return {
            "score": score, "readiness": readiness,
            "matched": [s.title() for s in matched], "missing": [s.title() for s in missing]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))