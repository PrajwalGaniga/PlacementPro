import asyncio
import random
from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB configuration
MONGO_URL = "mongodb://localhost:27017"
DATABASE_NAME = "placementpro"
COLLEGE_ID = "SIT-MLR"
COLLEGE_NAME = "Srinivas Institue of technology"

# Student data generation constants
BRANCHES = ["Computer Science", "Information Science", "Electronics", "Mechanical", "Civil"]
GENDERS = ["Male", "Female"]

async def seed_data():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DATABASE_NAME]

    print(f"🌱 Seeding data for {COLLEGE_NAME}...")

    # 1. Seed TPO
    tpo_email = "ishwarya9448@gmail.com"
    tpo_data = {
        "college_id": COLLEGE_ID,
        "college_name": COLLEGE_NAME,
        "name": "Ishwarya",
        "email": tpo_email,
        "password": "12345",
        "place": "Mangalore",
        "state": "Karnataka",
        "country": "India"
    }
    
    await db["tpos"].update_one(
        {"email": tpo_email},
        {"$set": tpo_data},
        upsert=True
    )
    print(f"✅ TPO {tpo_email} seeded.")

    # 2. Seed College
    college_data = {
        "college_id": COLLEGE_ID,
        "name": COLLEGE_NAME,
        "place": "Mangalore",
        "state": "Karnataka",
        "country": "India"
    }
    await db["colleges"].update_one(
        {"college_id": COLLEGE_ID},
        {"$set": college_data},
        upsert=True
    )
    print(f"✅ College {COLLEGE_NAME} seeded.")

    # 3. Seed 150 Students
    students = []
    for i in range(1, 151):
        usn = f"4SN21CS{i:03d}"
        name = f"Student {i}"
        email = f"student{i}@srinivas.edu.in"
        branch = random.choice(BRANCHES)
        cgpa = round(random.uniform(6.5, 9.5), 2)
        backlogs = random.choice([0, 0, 0, 0, 1]) # Most students have 0 backlogs
        
        student = {
            "college_id": COLLEGE_ID,
            "name": name,
            "email": email,
            "usn": usn,
            "branch": branch,
            "cgpa": cgpa,
            "backlogs": backlogs,
            "placed": False,
            "joining_year": 2021,
            "graduation_year": 2025,
            "gender": random.choice(GENDERS),
            "skills": ["Python", "Java", "C++", "SQL"][:random.randint(1, 4)],
            "attendance_pct": round(random.uniform(75, 95), 1),
            "mock_score": round(random.uniform(50, 90), 1),
            "certifications": ["AWS Certified", "Google Cloud Associate"][:random.randint(0, 2)],
            "profile": {
                "phone": f"9876543{i:03d}",
                "experience": [],
                "projects": [],
                "education": []
            }
        }
        students.append(student)

    # Clear existing students for this college to avoid duplicates if re-running
    await db["students"].delete_many({"college_id": COLLEGE_ID})
    
    if students:
        await db["students"].insert_many(students)
    
    print(f"✅ 150 students seeded for {COLLEGE_NAME}.")
    print("✨ Seeding complete!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
