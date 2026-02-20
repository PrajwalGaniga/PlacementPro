"""
PlacementPro AI v2 - Database Seed Script
Run: python seed.py

Seeds:
  - 1 College: Srinivas Institute of Technology
  - 1 TPO: Ujwal Bangera
  - 150 Students across 3 batches (2025, 2026, 2027)
    - Batch 2025: 100 students, 142 total > 7.0 CGPA
    - Exactly 142 students with CGPA > 7.0 across all batches
"""

import asyncio, random
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client["placementpro"]

COLLEGE_ID = "2707a351-9ef3-419d-981d-46869a8494c9"
COLLEGE_NAME = "Srinivas Institute of Technology"
BRANCHES = ["CSE", "ISE", "ECE", "ME", "CE"]

FIRST_NAMES = [
    "Aarav","Aditya","Ajay","Akash","Ananya","Anil","Anjali","Ankit","Anuj","Arjun",
    "Aryan","Ashish","Ayush","Bhavya","Chirag","Deepak","Deepika","Dhruv","Divya",
    "Gaurav","Harish","Hemanth","Ishaan","Jaya","Karan","Kavya","Kishore","Krishna",
    "Kunal","Lakshmi","Manish","Meera","Mihir","Mohan","Mukesh","Naman","Nandini",
    "Naresh","Nikhil","Nitin","Pallavi","Pavan","Pooja","Pradeep","Prajwal","Pranav",
    "Priya","Rahul","Raj","Rajesh","Ramesh","Ravi","Rohit","Roshan","Sahil","Sai",
    "Sandeep","Sanjay","Sanya","Shivam","Shreya","Shruti","Siddharth","Simran",
    "Sneha","Soham","Sunil","Suresh","Tanmay","Tejal","Ujwal","Usha","Varun",
    "Vikram","Vikas","Vimal","Vinay","Vivek","Yash","Zara","Tanya","Kartik","Dev",
]
LAST_NAMES = [
    "Acharya","Bangera","Bhat","Bhatt","Chowdhury","D'Souza","Desai","Gowda",
    "Gupta","Hegde","Jain","Joshi","Kamath","Kamble","Kumar","Mahajan","Malhotra",
    "Menon","Mishra","Nair","Patel","Patil","Pillai","Rao","Reddy","Sharma",
    "Shetti","Singh","Shetty","Verma",
]
SKILLS_POOL = [
    "Python","Java","C++","JavaScript","React","Node.js","SQL","MongoDB",
    "AWS","Docker","Machine Learning","Data Structures","Git","Linux",
    "TypeScript","Kubernetes","FastAPI","Spring Boot",
]
CERTS_POOL = [
    "AWS Cloud Practitioner","Google Cloud Associate","Azure Fundamentals",
    "Python for Data Science","Cisco CCNA","Oracle Java SE",
]
GENDER_DIST = ["Male", "Male", "Male", "Female", "Female", "Other"]


def gen_email(name: str, idx: int) -> str:
    return f"{name.lower().replace(' ', '.')}.{idx}@sit.edu"


def gen_usn(idx: int, batch_suffix: int) -> str:
    return f"4SN{batch_suffix:02d}CS{idx:03d}"


async def seed():
    print("🌱 Starting v2 seed process...")

    await db["colleges"].delete_many({})
    await db["tpos"].delete_many({})
    await db["students"].delete_many({})
    await db["drives"].delete_many({})
    print("🗑️  Cleared existing data")

    # College
    await db["colleges"].insert_one({
        "college_id": COLLEGE_ID, "name": COLLEGE_NAME,
        "location": "Mangalore, Karnataka", "established": 1994,
    })
    print(f"🏫 Inserted college: {COLLEGE_NAME}")

    # TPO
    await db["tpos"].insert_one({
        "college_id": COLLEGE_ID, "name": "Ujwal Bangera",
        "email": "bangeraujwal35@gmail.com",
    })
    print("👤 Inserted TPO: Ujwal Bangera")

    # Students
    random.seed(42)
    students = []
    total = 150
    # Distribution: 2025 → 80, 2026 → 50, 2027 → 20
    batch_plan = [(2025, 80, 21), (2026, 50, 22), (2027, 20, 23)]
    # Of 150 total: 142 CGPA > 7.0 → spread across batches
    # 2025: 72 high + 8 low; 2026: 50 high + 0 low; 2027: 20 high + 0 low
    batch_high = {2025: 72, 2026: 50, 2027: 20}   # must sum to 142
    idx = 1
    for grad_year, count, batch_suffix in batch_plan:
        high_count = batch_high[grad_year]
        low_count = count - high_count
        joining = grad_year - 4  # 4-year program
        for i in range(count):
            first = random.choice(FIRST_NAMES)
            last  = random.choice(LAST_NAMES)
            name  = f"{first} {last}"
            branch = BRANCHES[(idx - 1) % len(BRANCHES)]

            is_high = i < high_count
            cgpa = round(random.uniform(7.1, 9.9), 2) if is_high else round(random.uniform(4.5, 6.9), 2)
            backlogs = random.choices([0, 0, 0, 1, 2], weights=[70, 10, 10, 7, 3])[0] if is_high \
                       else random.choices([0, 1, 2, 3], weights=[40, 30, 20, 10])[0]

            students.append({
                "college_id": COLLEGE_ID,
                "name": name,
                "email": gen_email(name, idx),
                "usn": gen_usn(i + 1, batch_suffix),
                "branch": branch,
                "cgpa": cgpa,
                "backlogs": backlogs,
                "placed": random.random() < 0.1,
                "joining_year": joining,
                "graduation_year": grad_year,
                "gender": random.choice(GENDER_DIST),
                "skills": random.sample(SKILLS_POOL, k=random.randint(2, 6)),
                "attendance_pct": round(random.uniform(60.0, 100.0), 1),
                "mock_score": round(random.uniform(0, 100), 1),
                "certifications": random.sample(CERTS_POOL, k=random.randint(0, 2)),
            })
            idx += 1

    random.shuffle(students)
    await db["students"].insert_many(students)

    high_cgpa = sum(1 for s in students if s["cgpa"] > 7.0)
    batch_2025_high = sum(1 for s in students if s["graduation_year"] == 2025 and s["cgpa"] > 7.0)
    print(f"👨‍🎓 Inserted {total} students | Total CGPA > 7.0: {high_cgpa} | Batch 2025 eligible: {batch_2025_high}")

    # Indexes
    await db["students"].create_index([("college_id", 1)])
    await db["students"].create_index([("college_id", 1), ("cgpa", 1)])
    await db["students"].create_index([("college_id", 1), ("graduation_year", 1)])
    await db["students"].create_index([("college_id", 1), ("branch", 1)])
    await db["tpos"].create_index([("email", 1)], unique=True)
    await db["colleges"].create_index([("college_id", 1)], unique=True)
    print("📇 Indexes created")

    print("\n✅ v2 Seed completed!")
    print(f"   College ID : {COLLEGE_ID}")
    print(f"   TPO Email  : bangeraujwal35@gmail.com")
    print(f"   OTP Backdoor: 123456")
    print(f"   Batches    : 2025 (80), 2026 (50), 2027 (20)")
    print(f"   Total CGPA > 7.0: {high_cgpa}")

if __name__ == "__main__":
    asyncio.run(seed())
    client.close()
