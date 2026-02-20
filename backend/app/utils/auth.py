from fastapi import Header, HTTPException, status
from app.utils.jwt_handler import verify_access_token


async def get_current_user(authorization: str = Header(...)) -> dict:
    """Dependency to extract and verify JWT from Authorization header."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
        )
    token = authorization.split(" ")[1]
    payload = verify_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return payload
