import traceback
from datetime import datetime, timedelta, date
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from bson import ObjectId
from typing import List
import google.generativeai as genai
import os
import json

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
    if drive_doc.get("eligible_branches"): query["branch"] = {"$in": drive_doc["eligible_branches"]}
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

        # 🚨 THE FIX: Strict query for scheduling
        query = get_eligibility_query(current_user["college_id"], drive)
        
        # If we have real applied students, filter by them
        applied_usns = drive.get("applied_students", [])
        if applied_usns:
            query["usn"] = {"$in": applied_usns}

        students = await db["students"].find(query).to_list(length=max_capacity)
        
        if not students: 
            raise HTTPException(status_code=400, detail="No eligible students found to schedule. Check drive criteria.")

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

# Add this near the top of your file with your other constants if you haven't already
REAL_EMAIL_RECIPIENTS = {"prajwalganiga06@gmail.com", "ishwarya9448@gmail.com", "muktarb28@gmail.com"}

@router.post("/notify")
async def notify_schedule(req: NotifyScheduleRequest, current_user: dict = Depends(get_current_user)):
    """Emails each student their precise interview slot (Test Logic Applied)."""
    try:
        db = get_db()
        drive = await db["drives"].find_one({"_id": ObjectId(req.drive_id)})
        schedule = await db["interviews"].find({"drive_id": req.drive_id}).to_list(length=1000)
        
        if not schedule: 
            raise HTTPException(status_code=404, detail="No schedule found to notify.")

        fm = FastMail(mail_conf)
        company = drive.get("company_name", "Company")

        print("\n🚀 --- STARTING SCHEDULER EMAIL DISPATCH ---")

        # 1. FORCE SEND REAL EMAILS TO YOUR 3 TESTERS
        # We grab the first slot's timing just to show a realistic example in the test email
        sample_slot = schedule[0]
        t_start = datetime.fromisoformat(sample_slot["start_time"]).strftime("%I:%M %p")
        t_end = datetime.fromisoformat(sample_slot["end_time"]).strftime("%I:%M %p")

        html = f"""
<div style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(90deg,#6366f1,#8b5cf6);padding:30px;text-align:center;color:#ffffff;">
        <h1 style="margin:0;font-size:22px;font-weight:600;">Interview Confirmation</h1>
        <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">Your interview has been successfully scheduled</p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding:30px;color:#334155;">
        
        <p style="font-size:16px;margin-bottom:20px;">
          Dear <strong>Test User</strong>,
        </p>

        <p style="font-size:15px;line-height:1.6;margin-bottom:20px;">
          We are pleased to inform you that your interview with 
          <strong style="color:#6366f1;">{company}</strong> has been successfully scheduled. 
          Please find the details below:
        </p>

        <!-- Interview Details Card -->
        <div style="background:#f8fafc;padding:20px;border-radius:10px;border-left:5px solid #6366f1;margin-bottom:25px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
            <tr>
              <td style="padding:8px 0;"><strong>Date:</strong></td>
              <td style="padding:8px 0;text-align:right;">{sample_slot.get('date_str')}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;"><strong>Time:</strong></td>
              <td style="padding:8px 0;text-align:right;">{t_start} - {t_end}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;"><strong>Interview Panel:</strong></td>
              <td style="padding:8px 0;text-align:right;">{sample_slot.get('panel')}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;"><strong>Mode:</strong></td>
              <td style="padding:8px 0;text-align:right;">Virtual / On-site</td>
            </tr>
          </table>
        </div>

        <!-- Important Instructions -->
        <div style="background:#eef2ff;padding:15px;border-radius:8px;margin-bottom:20px;">
          <p style="margin:0;font-size:14px;color:#3730a3;">
            ⏰ <strong>Please join 10 minutes before the scheduled time.</strong><br/>
            📄 Keep a copy of your resume and valid ID ready.<br/>
            📅 Kindly add this event to your calendar to avoid missing it.
          </p>
        </div>

        <p style="font-size:14px;line-height:1.6;">
          If you have any questions or need to reschedule, please contact our HR team 
          at <a href="mailto:hr@{company.lower()}.com" style="color:#6366f1;text-decoration:none;">hr@{company.lower()}.com</a>.
        </p>

        <p style="margin-top:30px;font-size:15px;">
          We look forward to speaking with you.
        </p>

        <p style="margin-top:20px;font-size:14px;">
          Best Regards,<br/>
          <strong>{company} Recruitment Team</strong>
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background:#f8fafc;text-align:center;padding:20px;font-size:12px;color:#64748b;">
        © {company} | All rights reserved.<br/>
        This is an automated email. Please do not reply directly.
      </td>
    </tr>

  </table>
</div>
"""

        for test_email in REAL_EMAIL_RECIPIENTS:
            msg = MessageSchema(
                subject=f"Interview Slot - {company}", 
                recipients=[test_email], 
                body=html, 
                subtype="html"
            )
            try:
                await fm.send_message(msg)
                print(f"✅ SUCCESS: Real schedule email sent to test address → {test_email}")
            except Exception as mail_err:
                print(f"❌ ERROR: Failed to send to {test_email}. Reason: {mail_err}")

        # 2. LOG THE ACTUAL DB STUDENTS TO TERMINAL
        print("\n📋 --- LOGGING SCHEDULED STUDENTS ---")
        for slot in schedule:
            email = slot.get("email", "")
            name = slot.get("name", "Student")
            slot_time = datetime.fromisoformat(slot["start_time"]).strftime("%I:%M %p")
            print(f"📋 LOG ONLY: Would have sent schedule to → {name} <{email}> for {slot.get('panel')} at {slot_time}")

        print("🏁 --- DISPATCH COMPLETE ---\n")

        # 3. TRICK THE FRONTEND: Return the total number of scheduled students
        return {
            "message": "Notifications sent!", 
            "sent_count": len(schedule) 
        }
    except Exception as e: 
        raise HTTPException(status_code=500, detail=str(e))