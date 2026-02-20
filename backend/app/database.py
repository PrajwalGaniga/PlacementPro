import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

client: AsyncIOMotorClient = None


async def connect_db():
    global client
    client = AsyncIOMotorClient(MONGO_URL)
    print("✅ Connected to MongoDB")


async def close_db():
    global client
    if client:
        client.close()
        print("🔴 MongoDB connection closed")


def get_db():
    return client["placementpro"]
