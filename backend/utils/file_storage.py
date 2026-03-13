"""
utils/file_storage.py – File upload helpers.
Saves files to /static/{type}/ directory.
Structure designed to be easily swapped for S3.
"""

import os
import aiofiles
from datetime import datetime
from typing import Optional
from pathlib import Path

from fastapi import UploadFile, HTTPException

STATIC_DIR = Path(__file__).parent.parent / "static"
RESUMES_DIR = STATIC_DIR / "resumes"
LOGOS_DIR = STATIC_DIR / "logos"

# Ensure directories exist
RESUMES_DIR.mkdir(parents=True, exist_ok=True)
LOGOS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_RESUME_EXTENSIONS = {".pdf"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".svg"}
MAX_RESUME_SIZE = 5 * 1024 * 1024   # 5 MB
MAX_LOGO_SIZE = 2 * 1024 * 1024     # 2 MB


def _validate_file(
    filename: str,
    size: int,
    allowed_extensions: set,
    max_size: int,
    label: str = "File",
) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"{label} must be one of: {', '.join(allowed_extensions)}. Got: {ext}",
        )
    if size > max_size:
        raise HTTPException(
            status_code=413,
            detail=f"{label} too large. Max allowed: {max_size // 1024 // 1024} MB",
        )
    return ext


async def save_resume(file: UploadFile, usn: str) -> str:
    """Save a resume PDF and return its public URL path."""
    contents = await file.read()
    ext = _validate_file(file.filename or "resume.pdf", len(contents), ALLOWED_RESUME_EXTENSIONS, MAX_RESUME_SIZE, "Resume")

    timestamp = int(datetime.utcnow().timestamp())
    safe_usn = usn.replace("/", "_")
    filename = f"{safe_usn}_{timestamp}{ext}"
    filepath = RESUMES_DIR / filename

    async with aiofiles.open(filepath, "wb") as f:
        await f.write(contents)

    return f"/static/resumes/{filename}"


async def save_logo(file: UploadFile, college_id: str) -> str:
    """Save a company/college logo and return its public URL path."""
    contents = await file.read()
    ext = _validate_file(file.filename or "logo.png", len(contents), ALLOWED_IMAGE_EXTENSIONS, MAX_LOGO_SIZE, "Logo")

    safe_id = college_id.replace("/", "_")
    filename = f"{safe_id}{ext}"
    filepath = LOGOS_DIR / filename

    async with aiofiles.open(filepath, "wb") as f:
        await f.write(contents)

    return f"/static/logos/{filename}"


async def save_drive_logo(file: UploadFile, drive_id: str) -> str:
    """Save a drive/company logo."""
    contents = await file.read()
    ext = _validate_file(file.filename or "logo.png", len(contents), ALLOWED_IMAGE_EXTENSIONS, MAX_LOGO_SIZE, "Logo")

    timestamp = int(datetime.utcnow().timestamp())
    safe_id = drive_id.replace("/", "_")
    filename = f"drive_{safe_id}_{timestamp}{ext}"
    filepath = LOGOS_DIR / filename

    async with aiofiles.open(filepath, "wb") as f:
        await f.write(contents)

    return f"/static/logos/{filename}"


def delete_resume(resume_url: str) -> bool:
    """Delete a resume file given its URL path."""
    try:
        filename = Path(resume_url).name
        filepath = RESUMES_DIR / filename
        if filepath.exists():
            os.remove(filepath)
            return True
        return False
    except Exception as e:
        print(f"[FILE STORAGE] Error deleting resume: {e}")
        return False
