"""
database.py – Async Motor MongoDB client.
Provides typed collection accessors and creates indexes on startup.
"""

from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

# ── Client & DB ────────────────────────────────────────────────────────────────
_client: AsyncIOMotorClient = None  # type: ignore


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.MONGO_URL)
    return _client


def get_db():
    return get_client()[settings.DB_NAME]


# ── Named collection helpers ───────────────────────────────────────────────────
def colleges():
    return get_db()["colleges"]


def tpos():
    return get_db()["tpos"]


def students():
    return get_db()["students"]


def drives():
    return get_db()["drives"]


def applications():
    return get_db()["applications"]


def analytics():
    return get_db()["analytics"]


def notifications():
    return get_db()["notifications"]


def interview_schedules():
    return get_db()["interview_schedules"]


def chat_history():
    return get_db()["chat_history"]


def otp_store():
    return get_db()["otp_store"]


# ── Index creation ─────────────────────────────────────────────────────────────
async def create_indexes() -> None:
    from pymongo import ASCENDING, IndexModel

    # colleges
    await colleges().create_index("college_id", unique=True)

    # tpos
    await tpos().create_index("email", unique=True)

    # students
    await students().create_index("usn", unique=True)
    await students().create_index("email")
    await students().create_index("college_id")

    # drives
    await drives().create_index("drive_id", unique=True)
    await drives().create_index("college_id")

    # applications
    await applications().create_index("application_id", unique=True)
    await applications().create_index(
        [("usn", ASCENDING), ("drive_id", ASCENDING)], unique=True
    )

    # analytics
    await analytics().create_index("analytics_id", unique=True)
    await analytics().create_index("college_id")

    # notifications
    await notifications().create_index("notification_id", unique=True)
    await notifications().create_index(
        [("recipient_usn", ASCENDING), ("is_read", ASCENDING)]
    )

    # interview_schedules
    await interview_schedules().create_index("schedule_id", unique=True)
    await interview_schedules().create_index("drive_id")

    # chat_history
    await chat_history().create_index("chat_id", unique=True)
    await chat_history().create_index("usn")

    # otp_store – TTL index: auto-delete after 10 minutes
    await otp_store().create_indexes([
        IndexModel("created_at", expireAfterSeconds=600)
    ])
