from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import JSONResponse
from app.database import get_db
from app.models.drive import Drive, EligibilityCheck, NotifyRequest
from app.utils.auth import get_current_user
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
import os, io, json, uuid, shutil
import PyPDF2
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/drive", tags=["Drive"])

# ── Gemini Setup ──────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
genai.configure(api_key=GEMINI_API_KEY)

# ── Logo Storage ──────────────────────────────────────────────────────────────
LOGO_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "drive-logos")
os.makedirs(LOGO_DIR, exist_ok=True)
LOGO_BASE_URL = "http://localhost:8000/logos"

# ── Real email recipients for notify ─────────────────────────────────────────
# Update this line near the top of drive.py
REAL_EMAIL_RECIPIENTS = {"prajwalganiga06@gmail.com", "ishwarya9448@gmail.com", "muktarb28@gmail.com"}

# ── Mail config ───────────────────────────────────────────────────────────────
mail_conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", ""),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
    MAIL_FROM=os.getenv("MAIL_FROM", ""),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
)

# ── Null template for 4-category parse ───────────────────────────────────────
JD_NULL_TEMPLATE = {
    "company_name": None,
    "industry_category": None,
    "work_location": None,
    "job_role": None,
    "package_ctc": None,
    "bond_details": None,
    "drive_date_time": None,
    "venue": None,
    "application_deadline": None,
    "min_cgpa": None,
    "max_backlogs": None,
    "eligible_branches": [],
    "target_batches": [],
    "gender_pref": None,
    "required_skills": [],
    "required_certs": [],
    "min_attendance_pct": None,
    "min_mock_score": None,
    "description": None,
}

# ── 4-Category Gemini Prompt ──────────────────────────────────────────────────
JD_PROMPT = """
You are an expert HR document parser for a College Placement Management System.
Analyze the Job Description below and extract ONLY the following fields,
organized into 4 exact categories.

Return a SINGLE valid JSON object with EXACTLY these keys (no extra keys):

CATEGORY 1 – WHO & WHERE:
  "company_name"       : string           (company/organization name)
  "industry_category"  : string           (e.g. "Fintech", "FAANG", "EdTech", "IT Services")
  "work_location"      : string           (one of: "In-office", "Remote", "Hybrid")
  "job_role"           : string           (exact job title/designation)

CATEGORY 2 – LOGISTICS:
  "package_ctc"        : string           (e.g. "12 LPA", "8-10 LPA", "As per norms")
  "bond_details"       : string           (e.g. "No Bond", "2-year service agreement")
  "drive_date_time"    : string           (date/time of first round if mentioned, else null)
  "venue"              : string           (room number, address, or virtual link, else null)
  "application_deadline" : string         (deadline date if mentioned, else null)

CATEGORY 3 – COMPANY FILTERS:
  "min_cgpa"           : number           (minimum CGPA, e.g. 7.5; 0 if not mentioned)
  "max_backlogs"       : number           (maximum allowed backlogs; 0 if not mentioned)
  "eligible_branches"  : array of strings (e.g. ["CSE", "ISE", "ECE"]; use short codes)
  "target_batches"     : array of strings (graduation years e.g. ["2025", "2026"]; [] if unknown)
  "gender_pref"        : string           ("Any" if not mentioned; else "Female Only" / "Male Only")
  "required_skills"    : array of strings (technical skills, tools, languages)

CATEGORY 4 – COLLEGE ADD-ONS:
  "required_certs"     : array of strings (certifications required; [] if none)
  "min_attendance_pct" : number           (minimum attendance %; 0 if not mentioned)
  "min_mock_score"     : number           (internal mock score threshold; 0 if not mentioned)

EXTRA:
  "description"        : string           (1-2 sentence summary of the role, max 200 chars)

STRICT RULES:
1. If a field is NOT mentioned in the JD, use null for strings/numbers and [] for arrays.
2. "gender_pref" defaults to "Any" if not mentioned.
3. Do NOT include explanations or markdown. Return ONLY raw JSON.
4. Do NOT invent data — only extract what is explicitly stated.

Job Description Text:
{jd_text}
"""

# ── Universal Eligibility Query Builder ──
def get_eligibility_query(college_id: str, drive_doc: dict) -> dict:
    """Consistently builds the exact MongoDB query for student eligibility."""
    query = {
        "college_id": college_id,
        "cgpa": {"$gte": float(drive_doc.get("min_cgpa", 0))},
        "backlogs": {"$lte": int(drive_doc.get("max_backlogs", 10))}
    }
    
    if drive_doc.get("eligible_branches"):
        query["branch"] = {"$in": drive_doc["eligible_branches"]}
        
    if drive_doc.get("target_batches"):
        batch_years = [int(b) for b in drive_doc["target_batches"] if str(b).isdigit()]
        if batch_years:
            query["graduation_year"] = {"$in": batch_years}
            
    if drive_doc.get("gender_pref") and drive_doc.get("gender_pref") not in ("Any", ""):
        query["gender"] = drive_doc["gender_pref"]
        
    if drive_doc.get("min_attendance_pct", 0) > 0:
        query["attendance_pct"] = {"$gte": float(drive_doc["min_attendance_pct"])}
        
    if drive_doc.get("min_mock_score", 0) > 0:
        query["mock_score"] = {"$gte": float(drive_doc["min_mock_score"])}
        
    # Optional: If you only want to allow unplaced students, uncomment below:
    # query["placed"] = False 

    return query

def extract_pdf_text(file_bytes: bytes) -> str:
    reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
    return "".join(page.extract_text() or "" for page in reader.pages).strip()


# In backend/app/routes/drive.py

async def parse_with_gemini(jd_text: str) -> dict:
    prompt = JD_PROMPT.format(jd_text=jd_text[:5000])
    for model_name in FALLBACK_MODELS:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            raw = response.text.strip()
            # Strip markdown code fences
            if raw.startswith("```"):
                parts = raw.split("```")
                raw = parts[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            return json.loads(raw.strip())
        except Exception as e:
            # Add this print statement to see exactly WHY it's failing
            print(f"⚠️ Gemini Parse Error ({model_name}): {str(e)}")
            continue
    
    print("❌ All Gemini models failed. Returning empty template.")
    return JD_NULL_TEMPLATE


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/parse-jd")
async def parse_jd(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload a PDF JD → Gemini extracts 4-category structured data."""
    try:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are accepted")
        file_bytes = await file.read()
        jd_text = extract_pdf_text(file_bytes)
        if not jd_text:
            return JD_NULL_TEMPLATE
        parsed = await parse_with_gemini(jd_text)
        return parsed
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"JD parse failed: {str(e)}")


@router.post("/upload-logo")
async def upload_logo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload a company logo. Returns the public URL."""
    try:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".png", ".jpg", ".jpeg", ".svg", ".webp"]:
            raise HTTPException(status_code=400, detail="Unsupported image format")
        filename = f"{uuid.uuid4()}_{file.filename}"
        dest = os.path.join(LOGO_DIR, filename)
        contents = await file.read()
        with open(dest, "wb") as f:
            f.write(contents)
        url = f"{LOGO_BASE_URL}/{filename}"
        return {"logo_url": url, "filename": filename}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Logo upload failed: {str(e)}")


@router.post("/create")
async def create_drive(
    drive: Drive,
    current_user: dict = Depends(get_current_user),
):
    """Create a new placement drive (JSON body)."""
    try:
        db = get_db()
        drive_dict = drive.dict()
        drive_dict["college_id"] = current_user.get("college_id")
        drive_dict["created_by"] = current_user.get("sub")
        result = await db["drives"].insert_one(drive_dict)
        return {"message": "Drive created", "drive_id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Create drive failed: {str(e)}")


# In backend/app/routes/drive.py

@router.get("/list")
async def list_drives(current_user: dict = Depends(get_current_user)):
    """List all drives for this college, newest first, with accurate applicant stats."""
    try:
        db = get_db()
        college_id = current_user.get("college_id")
        drives_cursor = db["drives"].find({"college_id": college_id}).sort("_id", -1)
        drives = await drives_cursor.to_list(length=100)
        
        for d in drives:
            d["_id"] = str(d["_id"])
            query = get_eligibility_query(college_id, d)
            d["eligible_count"] = await db["students"].count_documents(query)
            d["applied_count"] = len(d.get("applied_students", []))

        return drives
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"List drives failed: {str(e)}")

@router.post("/check-eligibility")
async def check_eligibility(criteria: EligibilityCheck, current_user: dict = Depends(get_current_user)):
    """Count students matching all eligibility criteria from the frontend form."""
    try:
        db = get_db()
        # Convert the Pydantic model to a dict so we can use our universal builder
        criteria_dict = criteria.dict()
        criteria_dict["min_attendance_pct"] = criteria.min_attendance_pct
        criteria_dict["min_mock_score"] = criteria.min_mock_score
        
        query = get_eligibility_query(criteria.college_id or current_user.get("college_id"), criteria_dict)
        count = await db["students"].count_documents(query)
        
        return {"eligible_count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eligibility check failed: {str(e)}")


@router.post("/notify")
async def notify_students(req: NotifyRequest, current_user: dict = Depends(get_current_user)):
    """Strictly notify ONLY eligible students."""
    try:
        db = get_db()
        from bson import ObjectId
        drive_doc = await db["drives"].find_one({"_id": ObjectId(req.drive_id)})
        if not drive_doc:
            raise HTTPException(status_code=404, detail="Drive not found")

        # 1. Fetch strictly eligible students
        query = get_eligibility_query(req.college_id, drive_doc)
        students = await db["students"].find(query, {"name": 1, "email": 1}).to_list(length=1000)

        # 🚨 THE FIX: Abort instantly if nobody is eligible
        if not students:
            raise HTTPException(status_code=400, detail="0 students are eligible for this drive. No emails sent.")

        real_sent = []
        logged = []
        fm = FastMail(mail_conf)

        print("\n🚀 --- STARTING EMAIL DISPATCH ---")

        html = f"""
        <div style="font-family:Inter,sans-serif;max-width:520px;margin:auto;
                    background:#0f172a;padding:32px;border-radius:12px;color:#e2e8f0">
          <h2 style="color:#6366f1">PlacementPro AI – Drive Alert 🚀</h2>
          <p>Hi there,</p>
          <p>A new placement drive is open for <strong>{drive_doc.get('company_name','')}</strong>!</p>
          <table style="width:100%;margin:24px 0;border-collapse:collapse">
            <tr><td style="padding:8px;color:#94a3b8">Role</td>
                <td style="padding:8px;font-weight:600">{drive_doc.get('job_role','—')}</td></tr>
            <tr><td style="padding:8px;color:#94a3b8">Package</td>
                <td style="padding:8px;font-weight:600">{drive_doc.get('package_ctc','—')}</td></tr>
          </table>
          <p style="color:#94a3b8;font-size:13px">Login to PlacementPro AI for full details.</p>
        </div>
        """

        # 2. Only send to test emails IF the system found eligible students
        for test_email in REAL_EMAIL_RECIPIENTS:
            msg = MessageSchema(subject=f"Placement Drive Alert – {drive_doc.get('company_name','')}", recipients=[test_email], body=html, subtype="html")
            try:
                await fm.send_message(msg)
                real_sent.append(test_email)
            except Exception as mail_err:
                print(f"❌ ERROR: Failed to send to {test_email}. Reason: {mail_err}")

        # 3. Log real database students
        for s in students:
            email = s.get("email", "")
            name = s.get("name", "Student")
            print(f"📋 LOG ONLY: Would have sent to → {name} <{email}>")
            logged.append(email)

        return {
            "message": "Notifications dispatched",
            "total_eligible": len(students),
            "real_emails_sent": len(real_sent),
            "logged_count": len(logged),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Notify failed: {str(e)}")


@router.delete("/{drive_id}")
async def delete_drive(drive_id: str, current_user: dict = Depends(get_current_user)):
    try:
        from bson import ObjectId
        db = get_db()
        result = await db["drives"].delete_one(
            {"_id": ObjectId(drive_id), "college_id": current_user.get("college_id")}
        )
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Drive not found")
        return {"message": "Drive deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
