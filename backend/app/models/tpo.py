from pydantic import BaseModel, EmailStr
from typing import Optional


class TPO(BaseModel):
    college_id: str
    college_name: str
    name: str
    email: EmailStr
    password: str
    place: str
    state: str
    country: str


class OTPRequest(BaseModel):
    email: EmailStr
    college_id: str


class OTPVerify(BaseModel):
    email: EmailStr
    otp: str


class TPOLogin(BaseModel):
    email: EmailStr
    password: str


class SuperAdminLogin(BaseModel):
    email: EmailStr
    password: str
