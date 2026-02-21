"""
Student JWT auth dependency – parallel to TPO auth but for student role.
Students authenticate via USN (POST /student/login).
"""
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "SIT_HACKATHON_2024_SECRET")
ALGORITHM  = "HS256"

bearer_scheme = HTTPBearer()


async def get_current_student(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        if payload.get("role") != "student":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Student token required",
            )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired student token",
        )
