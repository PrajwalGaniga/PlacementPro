from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.models.tpo import OTPRequest, OTPVerify
from app.utils.otp import send_otp, verify_otp
from app.utils.jwt_handler import create_access_token
from app.utils.auth import get_current_user

router = APIRouter(prefix="/tpo", tags=["TPO"])


@router.get("/colleges")
async def get_colleges():
    """Get list of all colleges."""
    try:
        db = get_db()
        colleges = await db["colleges"].find({}, {"_id": 0}).to_list(length=100)
        return colleges
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch colleges: {str(e)}")


@router.post("/send-otp")
async def send_otp_endpoint(request: OTPRequest):
    """Send OTP to TPO email for the given college."""
    try:
        db = get_db()
        # Verify this email belongs to a TPO for the given college
        tpo = await db["tpos"].find_one(
            {"email": request.email, "college_id": request.college_id}
        )
        if not tpo:
            raise HTTPException(
                status_code=404,
                detail="No TPO found with this email for the selected college",
            )
        await send_otp(request.email)
        return {"message": "OTP sent successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {str(e)}")


@router.post("/verify-otp")
async def verify_otp_endpoint(request: OTPVerify):
    """Verify OTP and return JWT access token."""
    try:
        db = get_db()
        is_valid = verify_otp(request.email, request.otp)
        if not is_valid:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")

        # Get TPO details
        tpo = await db["tpos"].find_one({"email": request.email}, {"_id": 0})
        if not tpo:
            raise HTTPException(status_code=404, detail="TPO not found")

        token = create_access_token(
            data={
                "sub": request.email,
                "college_id": tpo["college_id"],
                "name": tpo.get("name", ""),
            }
        )
        return {
            "access_token": token,
            "token_type": "bearer",
            "college_id": tpo["college_id"],
            "name": tpo.get("name", ""),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")


@router.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics for a college."""
    try:
        db = get_db()
        college_id = current_user.get("college_id")

        total_students = await db["students"].count_documents({"college_id": college_id})
        placed_students = await db["students"].count_documents(
            {"college_id": college_id, "placed": True}
        )
        active_drives = await db["drives"].count_documents(
            {"college_id": college_id, "active": True}
        )
        total_eligible = await db["students"].count_documents(
            {"college_id": college_id, "cgpa": {"$gte": 7.0}, "backlogs": {"$lte": 0}}
        )

        return {
            "total_students": total_students,
            "placed_students": placed_students,
            "active_drives": active_drives,
            "total_eligible": total_eligible,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")


@router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get current TPO profile."""
    try:
        db = get_db()
        tpo = await db["tpos"].find_one(
            {"email": current_user["sub"]}, {"_id": 0}
        )
        if not tpo:
            raise HTTPException(status_code=404, detail="TPO not found")
        return tpo
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {str(e)}")
