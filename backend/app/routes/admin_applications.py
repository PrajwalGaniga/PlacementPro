from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from pydantic import BaseModel

# ✅ FIX: Import get_db instead of db
from app.database import get_db 

router = APIRouter(prefix="/admin", tags=["Admin Applications"])

class ApplicationUpdate(BaseModel):
    status: str

@router.get("/drives/{drive_id}/applicants")
async def get_drive_applicants(drive_id: str):
    try:
        # ✅ FIX: Call get_db() inside the route
        db = get_db()
        
        # Fetch the drive to get required skills for on-the-fly ATS scoring
        drive = await db["drives"].find_one({"_id": ObjectId(drive_id)})
        req_skills = [s.strip().lower() for s in drive.get("required_skills", [])] if drive else []

        pipeline = [
            {"$match": {"drive_id": drive_id}},
            {
                "$lookup": {
                    "from": "students",
                    "localField": "usn", 
                    "foreignField": "usn",
                    "as": "student_info"
                }
            },
            {"$unwind": {"path": "$student_info", "preserveNullAndEmptyArrays": True}}
        ]
        
        # ✅ FIX: Use db["applications"]
        applicants = await db["applications"].aggregate(pipeline).to_list(length=1000)
        
        result = []
        for app in applicants:
            s_info = app.get("student_info", {})
            
            # Calculate ATS Score if not explicitly saved
            ats_score = app.get("ats_score")
            if ats_score is None:
                stu_skills = [s.strip().lower() for s in s_info.get("skills", [])]
                if not req_skills:
                    ats_score = 100
                else:
                    matched = [s for s in req_skills if s in stu_skills]
                    ats_score = int((len(matched) / len(req_skills)) * 100) if req_skills else 100

            result.append({
                "application_id": str(app["_id"]),
                "usn": app.get("usn", ""),
                "name": s_info.get("name", "Unknown"),
                "branch": s_info.get("branch", "N/A"),
                "resume_url": app.get("resume_url", ""),
                "ats_score": ats_score,
                "status": app.get("status", "Applied")
            })
            
        # Sort by ATS score highest to lowest
        result.sort(key=lambda x: x["ats_score"], reverse=True)
        return {"applicants": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/applications/{application_id}/status")
async def update_application_status(application_id: str, payload: ApplicationUpdate):
    valid_statuses = ["Applied", "Shortlisted", "Panel 1", "Selected", "Rejected"]
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")

    try:
        # ✅ FIX: Call get_db() and use db["applications"]
        db = get_db()
        result = await db["applications"].update_one(
            {"_id": ObjectId(application_id)},
            {"$set": {"status": payload.status}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Application not found or status unchanged")
        return {"message": f"Status updated to {payload.status}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))