"""
AI Analyzer & Excel Export Module
==================================
Endpoints:
  GET  /tpo/export-students  → Download all students as .xlsx
  POST /tpo/analyze-excel    → Upload .xlsx → Gemini comparative analysis (JSON)
  GET  /tpo/export-schedule/{drive_id} → Download interview schedule as .xlsx
"""
import io
import json
import re
import os

import pandas as pd
import google.generativeai as genai
from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from app.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(prefix="/tpo", tags=["AI Analyzer"])

# ──────────────────────────────────────────────────────────────
# Gemini setup  (uses GEMINI_API_KEY from .env)
# ──────────────────────────────────────────────────────────────
_GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
genai.configure(api_key=_GEMINI_KEY)
_AI_MODEL = "gemini-2.5-flash"


# ──────────────────────────────────────────────────────────────
# Helper: stream an in-memory Excel buffer as a download
# ──────────────────────────────────────────────────────────────
def _excel_response(df: pd.DataFrame, sheet: str, filename: str) -> StreamingResponse:
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name=sheet)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ──────────────────────────────────────────────────────────────
# 1.  GET /tpo/export-students
# ──────────────────────────────────────────────────────────────
@router.get("/export-students")
async def export_students(current_user: dict = Depends(get_current_user)):
    """Generate an Excel workbook of every student in the TPO's college."""
    try:
        db = get_db()
        college_id = current_user.get("college_id") or current_user.get("sub")

        # Build query — if no college_id found, still export (returns empty with clear message)
        query = {"college_id": college_id} if college_id else {}

        students = await db["students"].find(
            query,
            {"_id": 0, "password": 0, "password_hash": 0},
        ).to_list(2000)

        def _count(val) -> int:
            """Safely count items whether val is a list, int, or None."""
            if isinstance(val, list):
                return len(val)
            try:
                return int(val or 0)
            except (TypeError, ValueError):
                return 0

        rows = []
        for s in students:
            rows.append({
                "USN":              s.get("usn", "N/A"),
                "Name":             s.get("name", "Unknown"),
                "Branch":           s.get("branch", "N/A"),
                "CGPA":             s.get("cgpa", 0.0),
                "Backlogs":         s.get("backlogs", 0),
                "Skills":           ", ".join(s.get("skills") or []),
                "Project_Count":    _count(s.get("projects") or s.get("num_projects", 0)),
                "Experience_Count": _count(s.get("work_experience") or s.get("experience", [])),
                "Email":            s.get("email", ""),
                "Status":           "Placed" if s.get("placed") else "Not Placed",
            })

        df = pd.DataFrame(rows) if rows else pd.DataFrame(
            columns=["USN", "Name", "Branch", "CGPA", "Backlogs", "Skills",
                     "Project_Count", "Experience_Count", "Email", "Status"]
        )
        return _excel_response(df, "Students Data", "placement_data.xlsx")

    except Exception as e:
        raise HTTPException(500, f"Export failed: {e}")



# ──────────────────────────────────────────────────────────────
# 2.  POST /tpo/analyze-excel
# ──────────────────────────────────────────────────────────────
@router.post("/analyze-excel")
async def analyze_excel(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Read an Excel file and ask Gemini to analyse Placed vs Not-Placed."""
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))

        placed   = df[df["Status"] == "Placed"]   if "Status" in df.columns else pd.DataFrame()
        unplaced = df[df["Status"] == "Not Placed"] if "Status" in df.columns else pd.DataFrame()

        def _avg(col, subdf):
            return round(float(subdf[col].mean()), 2) if not subdf.empty and col in subdf.columns else 0

        def _skills(subdf):
            if subdf.empty or "Skills" not in subdf.columns:
                return ""
            return ", ".join(subdf["Skills"].dropna().tolist())[:1200]

        summary = f"""
TOTAL STUDENTS : {len(df)}

--- PLACED STUDENTS ({len(placed)}) ---
Avg CGPA       : {_avg('CGPA', placed)}
Avg Projects   : {_avg('Project_Count', placed)}
Avg Experience : {_avg('Experience_Count', placed)}
Avg Backlogs   : {_avg('Backlogs', placed)}
Skill strings  : {_skills(placed)}

--- UNPLACED STUDENTS ({len(unplaced)}) ---
Avg CGPA       : {_avg('CGPA', unplaced)}
Avg Projects   : {_avg('Project_Count', unplaced)}
Avg Experience : {_avg('Experience_Count', unplaced)}
Avg Backlogs   : {_avg('Backlogs', unplaced)}
Skill strings  : {_skills(unplaced)}
"""

        prompt = f"""You are an expert TPO (Training & Placement Officer) Data Analyst.
Analyse the statistical summary below comparing Placed vs Unplaced students.

Data:
{summary}

Return STRICTLY valid JSON — NO markdown fences, no explanation — using EXACTLY this schema:
{{
  "overview":       "2-sentence summary of batch performance.",
  "winning_edge":   ["bullet 1", "bullet 2", "bullet 3"],
  "critical_gaps":  ["gap 1", "gap 2", "gap 3"],
  "action_plan":    ["step 1", "step 2", "step 3"]
}}
"""
        model = genai.GenerativeModel(_AI_MODEL)
        resp = model.generate_content(prompt)
        clean = re.sub(r"^```[a-z]*\n?|\n?```$", "", resp.text.strip(), flags=re.MULTILINE).strip()
        return json.loads(clean)

    except json.JSONDecodeError:
        raise HTTPException(500, "Gemini returned non-JSON. Try again.")
    except Exception as e:
        print(f"EXCEL ANALYZER ERROR: {e}")
        raise HTTPException(500, f"Analysis failed: {e}")


# ──────────────────────────────────────────────────────────────
# 3.  GET /tpo/export-schedule/{drive_id}
# ──────────────────────────────────────────────────────────────
@router.get("/export-schedule/{drive_id}")
async def export_schedule(
    drive_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Export the generated interview schedule for a drive as .xlsx."""
    try:
        db = get_db()
        drive = await db["drives"].find_one({"_id": ObjectId(drive_id)})
        if not drive:
            raise HTTPException(404, "Drive not found")

        company  = drive.get("company_name", "Company")
        job_role = drive.get("job_role", "Role")

        slots_cursor = db["schedule_slots"].find({"drive_id": ObjectId(drive_id)})
        slots = await slots_cursor.to_list(2000)

        if not slots:
            # Fallback – check interview_schedule collection too
            slots_cursor2 = db["interview_schedule"].find({"drive_id": drive_id})
            slots = await slots_cursor2.to_list(2000)

        rows = []
        for sl in slots:
            rows.append({
                "Date":       sl.get("date_str", str(sl.get("date", ""))),
                "Panel":      sl.get("panel", ""),
                "Start Time": sl.get("start_time", ""),
                "End Time":   sl.get("end_time", ""),
                "USN":        sl.get("usn", ""),
                "Student Name": sl.get("name", ""),
                "Status":     sl.get("status", "Scheduled"),
                "Venue":      sl.get("venue", drive.get("venue", "")),
            })

        df = pd.DataFrame(rows) if rows else pd.DataFrame(
            columns=["Date","Panel","Start Time","End Time","USN","Student Name","Status","Venue"]
        )
        safe_company = re.sub(r"[^a-zA-Z0-9_]", "_", company)
        filename = f"schedule_{safe_company}.xlsx"
        return _excel_response(df, "Interview Schedule", filename)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Schedule export failed: {e}")
