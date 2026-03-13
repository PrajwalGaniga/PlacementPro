import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def update_students():
    MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client["placementpro"]
    
    # Update Graduation Year to 2027 and Backlogs to 0 for ALL students
    result = await db.students.update_many(
        {},
        {"$set": {"graduation_year": 2027, "backlogs": 0}}
    )
    
    print(f"✅ Demo Fix Complete:")
    print(f"Matched {result.matched_count} students.")
    print(f"Modified {result.modified_count} students.")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(update_students())
