import traceback
from datetime import datetime, timedelta, date
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from bson import ObjectId
from typing import List, Optional
import google.generativeai as genai
import os
import json
import io

from app.database import get_db
from app.utils.auth import get_current_user
from fastapi_mail import FastMail, MessageSchema
from app.utils.otp import conf as mail_conf  # Reusing your mail config

router = APIRouter(prefix="/scheduler", tags=["Scheduler"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
genai.configure(api_key=GEMINI_API_KEY)
FALLBACK_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash-latest"]

class ScheduleConfig(BaseModel):
    drive_id: str
    start_date: str         # "2026-03-25"
    end_date: str           # "2026-03-26"
    daily_start_time: str   # "09:00"
    daily_end_time: str     # "17:00"
    slot_duration_mins: int = 25
    break_duration_mins: int = 5
    panels: int = 2

class NotifyScheduleRequest(BaseModel):
    drive_id: str
    mode: str = "all"   # "all" | "test"

SORTING_PROMPT = """
You are an expert Technical Interview Scheduler AI.
Group students by their 'branch'. Rank students higher if their skills match these: {jd_skills}.
Students: {students_json}
Return ONLY a valid JSON list of student USNs. Example: ["1RN20CS001", "1RN20CS045"]
"""

async def ai_smart_sort(jd_skills: List[str], students: List[dict]) -> List[str]:
    if not students: return []
    clean_students = [{"usn": s.get("usn"), "branch": s.get("branch"), "skills": s.get("skills", [])} for s in students if s.get("usn")]
    prompt = SORTING_PROMPT.format(jd_skills=jd_skills, students_json=json.dumps(clean_students))
    
    for model_name in FALLBACK_MODELS:
        try:
            model = genai.GenerativeModel(model_name)
            res = model.generate_content(prompt).text.strip()
            if res.startswith("```"): res = res.split("```")[1].replace("json", "")
            return json.loads(res.strip())
        except Exception: continue
    return [s["usn"] for s in clean_students]

# Re-declare the builder so the scheduler has access to the same strict math
def get_eligibility_query(college_id: str, drive_doc: dict) -> dict:
    query = {
        "college_id": college_id,
        "cgpa": {"$gte": float(drive_doc.get("min_cgpa", 0))},
        "backlogs": {"$lte": int(drive_doc.get("max_backlogs", 10))}
    }
    if drive_doc.get("eligible_branches"):
        import re
        branch_map = {
            "CSE": "Computer Science.*?Engineering|CSE",
            "ECE": "Electronics.*?Communication|ECE",
            "ME": "Mechanical|ME",
            "CE": "Civil|CE",
            "ISE": "Information Science|ISE",
            "AI": "Artificial Intelligence|AI|AIML",
        }
        regex_list = []
        for b in drive_doc["eligible_branches"]:
            if not b: continue
            pattern = branch_map.get(b.upper(), f"^{re.escape(b)}$")
            regex_list.append(re.compile(pattern, re.IGNORECASE))
        if regex_list:
            query["branch"] = {"$in": regex_list}
    if drive_doc.get("target_batches"):
        batch_years = [int(b) for b in drive_doc["target_batches"] if str(b).isdigit()]
        if batch_years: query["graduation_year"] = {"$in": batch_years}
    if drive_doc.get("gender_pref") and drive_doc.get("gender_pref") not in ("Any", ""):
        query["gender"] = drive_doc["gender_pref"]
    if drive_doc.get("min_attendance_pct", 0) > 0: query["attendance_pct"] = {"$gte": float(drive_doc["min_attendance_pct"])}
    if drive_doc.get("min_mock_score", 0) > 0: query["mock_score"] = {"$gte": float(drive_doc["min_mock_score"])}
    return query

@router.post("/generate")
async def generate_schedule(config: ScheduleConfig, current_user: dict = Depends(get_current_user)):

    
    try:
        db = get_db()
        drive = await db["drives"].find_one({"_id": ObjectId(config.drive_id)})
        if not drive: raise HTTPException(status_code=404, detail="Drive not found")

        if not config.end_date or config.end_date.strip() == "":
            raise HTTPException(status_code=400, detail="End date cannot be empty")

        # Multi-Day Capacity Math
        start_d = datetime.strptime(config.start_date, "%Y-%m-%d").date()
        end_d = datetime.strptime(config.end_date, "%Y-%m-%d").date()
        t_start = datetime.strptime(config.daily_start_time, "%H:%M").time()
        t_end = datetime.strptime(config.daily_end_time, "%H:%M").time()

        days_count = (end_d - start_d).days + 1
        daily_mins = (datetime.combine(date.min, t_end) - datetime.combine(date.min, t_start)).total_seconds() / 60
        slot_delta = config.slot_duration_mins + config.break_duration_mins
        
        slots_per_day = int(daily_mins // slot_delta)
        max_capacity = slots_per_day * config.panels * days_count

        if max_capacity <= 0: raise HTTPException(status_code=400, detail="Invalid time configuration.")

        # 1. Check: Were there any actual applicants for this drive?
        applied_usns = drive.get("applied_students", [])
        if not applied_usns:
            raise HTTPException(status_code=400, detail="No students have applied for this drive yet. Share the drive link with students first.")

        # 2. Fetch only the applied students who also meet eligibility criteria
        query = get_eligibility_query(current_user["college_id"], drive)
        query["usn"] = {"$in": applied_usns}
        students = await db["students"].find(query).to_list(length=max_capacity)

        if not students:
            raise HTTPException(status_code=400, detail=f"{len(applied_usns)} student(s) applied but none meet the drive's eligibility criteria (CGPA, backlogs, branch). Check drive settings.")

        sorted_usns = await ai_smart_sort(drive.get("required_skills", []), students)
        student_map = {s.get("usn"): s for s in students if s.get("usn")}

        # Multi-Day Slotting Engine
        schedule = []
        current_date = start_d
        current_time = datetime.combine(current_date, t_start)
        panel_idx = 1

        for usn in sorted_usns:
            if usn not in student_map: continue

            # Day jump logic
            if current_time + timedelta(minutes=config.slot_duration_mins) > datetime.combine(current_date, t_end):
                current_date += timedelta(days=1)
                if current_date > end_d: break # Out of days!
                current_time = datetime.combine(current_date, t_start)

            schedule.append({
                "id": f"{usn}_{current_time.timestamp()}",
                "drive_id": config.drive_id,
                "usn": usn,
                "name": student_map[usn].get("name", "Student"),
                "email": student_map[usn].get("email", ""),
                "panel": f"Panel {panel_idx}",
                "start_time": current_time.isoformat(),
                "end_time": (current_time + timedelta(minutes=config.slot_duration_mins)).isoformat(),
                "date_str": current_date.strftime("%b %d, %Y")
            })

            panel_idx += 1
            if panel_idx > config.panels:
                panel_idx = 1
                current_time += timedelta(minutes=slot_delta)

        await db["interviews"].delete_many({"drive_id": config.drive_id})
        if schedule: await db["interviews"].insert_many(schedule)
        for item in schedule: item.pop("_id", None)

        return {"message": f"Successfully scheduled {len(schedule)} eligible students.", "schedule": schedule}
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

SCHEDULER_DEV_EMAILS = [
    "prajwalganiga06@gmail.com",
    "sanvi.s.shetty18@gmail.com",
    "varshiniganiga35@gmail.com",
    "ishwarya9448@gmail.com",
]

@router.get("/export-excel/{drive_id}")
async def export_schedule_excel(drive_id: str, current_user: dict = Depends(get_current_user)):
    """Export the current schedule for a drive as an Excel file."""
    try:
        import openpyxl
        db = get_db()
        schedule = await db["interviews"].find({"drive_id": drive_id}).to_list(length=1000)
        if not schedule:
            raise HTTPException(status_code=404, detail="No schedule found for this drive.")

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Interview Schedule"
        ws.append(["Student Name", "USN", "Date", "Slot Time", "End Time", "Panel"])
        for slot in schedule:
            ws.append([
                slot.get("name", ""),
                slot.get("usn", ""),
                slot.get("date_str", ""),
                datetime.fromisoformat(slot["start_time"]).strftime("%I:%M %p"),
                datetime.fromisoformat(slot["end_time"]).strftime("%I:%M %p"),
                slot.get("panel", ""),
            ])

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="schedule_{drive_id}.xlsx"'}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Excel export failed: {str(e)}")

@router.post("/notify")
async def notify_schedule(req: NotifyScheduleRequest, current_user: dict = Depends(get_current_user)):
    """Dual-mode schedule notification: 'test' sends to dev group, 'all' sends personalized slot emails."""
    try:
        db = get_db()
        drive = await db["drives"].find_one({"_id": ObjectId(req.drive_id)})
        schedule = await db["interviews"].find({"drive_id": req.drive_id}).to_list(length=1000)
        
        if not schedule:
            raise HTTPException(status_code=404, detail="No schedule found. Generate a schedule first.")

        fm = FastMail(mail_conf)
        company = drive.get("company_name", "Company") if drive else "Company"
        real_sent = []

        def build_slot_html(name: str, slot: dict) -> str:
            t_s = datetime.fromisoformat(slot["start_time"]).strftime("%I:%M %p")
            t_e = datetime.fromisoformat(slot["end_time"]).strftime("%I:%M %p")
            return f"""
<div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;background:#0f172a;border-radius:12px;overflow:hidden">
  <div style="background:linear-gradient(90deg,#6366f1,#8b5cf6);padding:28px;text-align:center;color:#fff">
    <h1 style="margin:0;font-size:22px">Interview Confirmation</h1>
    <p style="opacity:.9;margin:6px 0 0;font-size:14px">Your slot has been successfully scheduled</p>
  </div>
  <div style="padding:28px;color:#e2e8f0">
    <p>Dear <strong>{name}</strong>,</p>
    <p>Your interview with <strong style="color:#6366f1">{company}</strong> has been scheduled. Details:</p>
    <div style="background:#1e293b;padding:18px;border-radius:10px;border-left:4px solid #6366f1;margin:20px 0">
      <table style="width:100%;font-size:14px">
        <tr><td style="padding:6px 0;color:#94a3b8">Date</td><td style="text-align:right">{slot.get('date_str')}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8">Time</td><td style="text-align:right">{t_s} – {t_e}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8">Panel</td><td style="text-align:right">{slot.get('panel')}</td></tr>
      </table>
    </div>
    <p style="color:#94a3b8;font-size:13px">⏰ Join 10 minutes before. Keep resume and ID ready.</p>
  </div>
</div>"""

        if req.mode == "test":
            print("\n🧪 SCHEDULER NOTIFY: Developer Test Group")
            sample = schedule[0]
            html = build_slot_html("Test User", sample)
            for email in SCHEDULER_DEV_EMAILS:
                try:
                    msg = MessageSchema(subject=f"[TEST] Interview Slot – {company}", recipients=[email], body=html, subtype="html")
                    await fm.send_message(msg)
                    real_sent.append(email)
                    print(f"  ✅ Sent to {email}")
                except Exception as e:
                    print(f"  ❌ Failed {email}: {e}")
            return {"message": f"Test emails sent to {len(real_sent)} developers.", "mode": "test", "sent_count": len(real_sent)}

        else:
            # ALL mode: send personalized slot emails
            print(f"\n🚀 SCHEDULER NOTIFY: All Scheduled ({len(schedule)} students)")
            logged = []
            for slot in schedule:
                email = slot.get("email", "")
                name = slot.get("name", "Student")
                html = build_slot_html(name, slot)
                if email in SCHEDULER_DEV_EMAILS:
                    try:
                        msg = MessageSchema(subject=f"Interview Slot – {company}", recipients=[email], body=html, subtype="html")
                        await fm.send_message(msg)
                        real_sent.append(email)
                        print(f"  ✅ REAL SEND → {name} <{email}>")
                    except Exception as e:
                        print(f"  ❌ Failed → {email}: {e}")
                else:
                    print(f"  📋 LOG ONLY → {name} <{email}> | {slot.get('panel')} at {datetime.fromisoformat(slot['start_time']).strftime('%I:%M %p')}")
                    logged.append(email)

            return {
                "message": f"Schedule notifications dispatched for {len(schedule)} students.",
                "mode": "all",
                "total_scheduled": len(schedule),
                "real_emails_sent": len(real_sent),
                "logged_count": len(logged),
                "sent_count": len(real_sent)
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
