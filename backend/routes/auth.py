"""
routes/auth.py – All authentication endpoints.
"""

import random
import string
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

import database as db
from config import settings
from utils.auth_utils import (
    hash_password, verify_password,
    create_access_token, create_short_lived_token, decode_access_token,
    oauth2_scheme, get_current_user
)
from utils.email_service import send_otp

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Request / Response schemas ─────────────────────────────────────────────────
class SuperAdminLoginRequest(BaseModel):
    email: str
    password: str


class TPOLoginRequest(BaseModel):
    email: str
    password: str


class StudentLoginRequest(BaseModel):
    usn: str
    password: str
    college_id: str


class ForgotPasswordRequest(BaseModel):
    email: str
    role: str  # "tpo" | "student"


class VerifyOTPRequest(BaseModel):
    email: str
    otp: str


class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str


# ── Helper ─────────────────────────────────────────────────────────────────────
def _strip_id(doc: dict) -> dict:
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


# ── Endpoints ──────────────────────────────────────────────────────────────────
@router.post("/super-admin/login")
async def super_admin_login(body: SuperAdminLoginRequest):
    if (
        body.email != settings.SUPER_ADMIN_EMAIL
        or body.password != settings.SUPER_ADMIN_PASSWORD
    ):
        raise HTTPException(status_code=401, detail="Invalid super admin credentials")

    token = create_access_token({"sub": body.email, "role": "super_admin", "email": body.email})
    return {"access_token": token, "token_type": "bearer", "role": "super_admin", "email": body.email}


@router.post("/tpo/login")
async def tpo_login(body: TPOLoginRequest):
    tpo = await db.tpos().find_one({"email": body.email.lower(), "is_active": True})
    if not tpo:
        raise HTTPException(status_code=401, detail="TPO account not found")
    if not verify_password(body.password, tpo["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect password")

    role = "super_admin" if tpo.get("is_super_admin") else "tpo"
    token = create_access_token({
        "sub": tpo["email"],
        "role": role,
        "email": tpo["email"],
        "college_id": tpo["college_id"],
        "name": tpo["name"],
    })
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": role,
        "email": tpo["email"],
        "college_id": tpo["college_id"],
        "name": tpo["name"],
    }


@router.post("/student/login")
async def student_login(body: StudentLoginRequest):
    student = await db.students().find_one({
        "usn": body.usn.strip().upper(),
        "college_id": body.college_id,
        "is_active": True,
    })
    if not student:
        raise HTTPException(status_code=401, detail="Student not found. Check your USN and college.")
    if not verify_password(body.password, student["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect password. Default password is your USN.")

    token = create_access_token({
        "sub": student["usn"],
        "role": "student",
        "usn": student["usn"],
        "college_id": student["college_id"],
        "name": student.get("name", ""),
    })
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "student",
        "student": _strip_id(dict(student)),
    }


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest):
    email = body.email.lower()
    # Verify user exists
    if body.role == "tpo":
        user = await db.tpos().find_one({"email": email})
    elif body.role == "student":
        user = await db.students().find_one({"email": email})
    else:
        raise HTTPException(status_code=400, detail="role must be 'tpo' or 'student'")

    if not user:
        # Don't leak whether the email exists
        return {"message": "If the email exists, an OTP has been sent."}

    otp = "".join(random.choices(string.digits, k=6))
    await db.otp_store().insert_one({
        "email": email,
        "role": body.role,
        "otp": otp,
        "created_at": datetime.utcnow(),
    })

    send_otp(email, otp)
    return {"message": "OTP sent to your registered email. Valid for 10 minutes."}


@router.post("/verify-otp")
async def verify_otp(body: VerifyOTPRequest):
    record = await db.otp_store().find_one(
        {"email": body.email.lower(), "otp": body.otp},
        sort=[("created_at", -1)],
    )
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    # Delete the OTP
    await db.otp_store().delete_one({"_id": record["_id"]})

    reset_token = create_short_lived_token({
        "sub": body.email.lower(),
        "purpose": "password_reset",
        "role": record.get("role", "student"),
    }, minutes=5)

    return {"reset_token": reset_token, "message": "OTP verified. Use reset_token to set new password."}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest):
    payload = decode_access_token(body.reset_token)
    if not payload or payload.get("purpose") != "password_reset":
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    email = payload["sub"]
    role = payload.get("role", "student")
    new_hash = hash_password(body.new_password)

    if role == "tpo":
        result = await db.tpos().update_one({"email": email}, {"$set": {"password_hash": new_hash}})
    else:
        result = await db.students().update_one({"email": email}, {"$set": {"password_hash": new_hash}})

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "Password reset successful. You can now log in with your new password."}


@router.post("/refresh-token")
async def refresh_token(user: dict = Depends(get_current_user)):
    new_token = create_access_token({k: v for k, v in user.items() if k != "exp"})
    return {"access_token": new_token, "token_type": "bearer"}
