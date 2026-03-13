"""
seed_data.py - Database seeder for PlacementPro.

Drops all collections and re-seeds with:
  1. Super admin (fixed credentials)
  2. Srinivas Institute of Technology (SIT_001) college
  3. Ishwarya as TPO linked to SIT_001
  4. All 44 students from student_data.json

Usage:
    cd backend/
    python seed_data.py
"""

import asyncio
import json
import re
from datetime import datetime
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient

# We import directly without going through config to allow standalone execution
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "placementpro"
STUDENT_DATA_PATH = Path(__file__).resolve().parent / "student_data.json"

# Fixed credentials
SUPER_ADMIN_EMAIL = "prajwal@gmail.com"
SUPER_ADMIN_PASSWORD_PLAIN = "12345"

COLLEGE_ID = "SIT_001"
COLLEGE_NAME = "Srinivas Institute of Technology"

TPO_EMAIL = "ishwarya9448@gmail.com"
TPO_NAME = "ISHWARYA"
TPO_PASSWORD_PLAIN = "ishwarya9448"  # TPO's default password


def hash_password(password: str) -> str:
    from passlib.context import CryptContext
    ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return ctx.hash(password)


def parse_student_data_json(filepath: Path) -> list[dict]:
    """
    Parses the non-standard student_data.json which contains
    concatenated JSON objects (no wrapping array).
    """
    text = filepath.read_text(encoding="utf-8")
    # Find all {...} blocks
    pattern = re.compile(r'\{[^{}]+\}', re.DOTALL)
    students = []
    for match in pattern.finditer(text):
        try:
            obj = json.loads(match.group())
            if "usn" in obj and "name" in obj:
                students.append(obj)
        except json.JSONDecodeError:
            continue
    return students


async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print("=" * 50)
    print(" PlacementPro Database Seeder")
    print("=" * 50)

    # ── Drop all collections ──────────────────────────────
    COLLECTIONS = [
        "colleges", "tpos", "students", "drives", "applications",
        "analytics", "notifications", "interview_schedules", "chat_history", "otp_store"
    ]
    for col in COLLECTIONS:
        await db[col].drop()
        print(f"  🗑  Dropped collection: {col}")

    now = datetime.utcnow()

    # ── 1. College ────────────────────────────────────────
    college_doc = {
        "college_id": COLLEGE_ID,
        "name": COLLEGE_NAME,
        "place": "Mangalore",
        "state": "Karnataka",
        "country": "India",
        "logo_url": None,
        "created_at": now,
        "is_active": True,
    }
    await db["colleges"].insert_one(college_doc)
    print(f"  ✅ College inserted: {COLLEGE_NAME} [{COLLEGE_ID}]")

    # ── 2. TPO ────────────────────────────────────────────
    tpo_doc = {
        "email": TPO_EMAIL.lower(),
        "password_hash": hash_password(TPO_PASSWORD_PLAIN),
        "name": TPO_NAME,
        "college_id": COLLEGE_ID,
        "college_name": COLLEGE_NAME,
        "is_super_admin": False,
        "created_at": now,
        "is_active": True,
    }
    await db["tpos"].insert_one(tpo_doc)
    print(f"  ✅ TPO inserted: {TPO_NAME} [{TPO_EMAIL}]")

    # ── 3. Students from JSON ─────────────────────────────
    students_data = parse_student_data_json(STUDENT_DATA_PATH)
    if not students_data:
        print(f"  ⚠️  No students found in {STUDENT_DATA_PATH}")
    else:
        student_docs = []
        for s in students_data:
            usn = str(s.get("usn", "")).strip().upper()
            name = str(s.get("name", "")).strip()
            email = str(s.get("email", "")).strip().lower()
            branch = str(s.get("branch", "")).strip()
            if not usn:
                continue
            student_docs.append({
                "usn": usn,
                "email": email,
                "name": name,
                "branch": branch,
                "college_id": COLLEGE_ID,
                "password_hash": hash_password(usn),   # Default password = USN
                "phone": None,
                "cgpa": None,
                "backlogs": None,
                "graduation_year": None,
                "linkedin": None,
                "github": None,
                "portfolio": None,
                "resume_url": None,
                "placement_readiness_score": None,
                "placed": False,
                "placed_company": None,
                "placed_package": None,
                "skills": [],
                "projects": [],
                "experiences": [],
                "education": [],
                "created_at": now,
                "updated_at": now,
                "is_active": True,
            })
        if student_docs:
            await db["students"].insert_many(student_docs)
            print(f"  ✅ Students inserted: {len(student_docs)}")

    # ── 4. Create MongoDB indexes ─────────────────────────
    try:
        from database import create_indexes
        # Reinitialize the client used in database.py
        import database as db_module
        db_module._client = client
        await create_indexes()
        print("  ✅ Indexes created")
    except Exception as e:
        print(f"  ⚠️  Index creation skipped: {e}")

    client.close()

    print("=" * 50)
    print(f"  Summary:")
    print(f"    Colleges : 1 ({COLLEGE_NAME})")
    print(f"    TPOs     : 1 ({TPO_EMAIL})")
    print(f"    Students : {len(students_data)}")
    print(f"")
    print(f"  Login credentials:")
    print(f"    Super Admin : {SUPER_ADMIN_EMAIL} / {SUPER_ADMIN_PASSWORD_PLAIN}")
    print(f"    TPO         : {TPO_EMAIL} / {TPO_PASSWORD_PLAIN}")
    print(f"    Students    : USN (e.g. 4SN23CG004) / <their USN as password>")
    print("=" * 50)
    print("  ✅ Seed complete! Run: uvicorn main:app --reload")


if __name__ == "__main__":
    asyncio.run(seed())
