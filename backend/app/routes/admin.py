from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.models.tpo import SuperAdminLogin, TPO
from app.utils.jwt_handler import create_access_token
import uuid

router = APIRouter(prefix="/admin", tags=["Super Admin"])

# Hardcoded Super Admin Credentials
SUPER_ADMIN_EMAIL = "prajwalganiga06@gmail.com"
SUPER_ADMIN_PASSWORD = "12345"

@router.post("/login")
async def admin_login(request: SuperAdminLogin):
    if request.email == SUPER_ADMIN_EMAIL and request.password == SUPER_ADMIN_PASSWORD:
        token = create_access_token(
            data={"sub": request.email, "role": "super_admin"}
        )
        return {
            "access_token": token,
            "token_type": "bearer",
            "role": "super_admin",
            "email": request.email
        }
    raise HTTPException(status_code=401, detail="Invalid admin credentials")

@router.post("/tpo/add")
async def add_tpo(tpo_data: TPO):
    try:
        db = get_db()
        # Check if TPO already exists
        existing_tpo = await db["tpos"].find_one({"email": tpo_data.email})
        if existing_tpo:
            raise HTTPException(status_code=400, detail="TPO with this email already exists")
        
        # Check if college_id already exists
        existing_college = await db["colleges"].find_one({"college_id": tpo_data.college_id})
        if existing_college:
             raise HTTPException(status_code=400, detail="College ID already exists")

        # Add TPO
        tpo_dict = tpo_data.dict()
        await db["tpos"].insert_one(tpo_dict)
        
        # Add College details to colleges collection if not present
        college_entry = {
            "college_id": tpo_data.college_id,
            "name": tpo_data.college_name,
            "place": tpo_data.place,
            "state": tpo_data.state,
            "country": tpo_data.country
        }
        await db["colleges"].insert_one(college_entry)

        return {"message": "TPO and College added successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add TPO: {str(e)}")

@router.get("/tpo/list")
async def list_tpos():
    try:
        db = get_db()
        tpos = await db["tpos"].find({}, {"_id": 0}).to_list(length=100)
        return tpos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list TPOs: {str(e)}")
