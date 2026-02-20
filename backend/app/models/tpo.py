from pydantic import BaseModel, EmailStr
from typing import Optional


class TPO(BaseModel):
    college_id: str
    name: str
    email: EmailStr


class OTPRequest(BaseModel):
    email: EmailStr
    college_id: str


class OTPVerify(BaseModel):
    email: EmailStr
    otp: str
