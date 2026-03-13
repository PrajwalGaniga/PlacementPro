from app.database import connect_db, get_db
import asyncio

async def check():
    await connect_db()
    db = get_db()
    # Check students
    # Perform Fix: Update college_id for students
    res = await db["students"].update_many(
        {"college_id": "101"},
        {"$set": {"college_id": "SIT_001"}}
    )
    print(f"Updated {res.modified_count} students from 101 to SIT_001")

    # Check student again
    s = await db["students"].find_one({"usn": "4SN23CG009"})
    if s:
        print(f"Student USN: {s.get('usn')} | College ID: {s.get('college_id')}")

    
    # Perform Fix: Update college_id for TPOs
    res_tpo = await db["tpos"].update_many(
        {"college_id": "101"},
        {"$set": {"college_id": "SIT_001"}}
    )
    print(f"Updated {res_tpo.modified_count} TPOs from 101 to SIT_001")

    # Check TPO
    t = await db["tpos"].find_one({"college_id": "SIT_001"})
    if t:
        print(f"TPO: {t.get('name')} | College: {t.get('college_name')} | ID: {t.get('college_id')}")

    # Check colleges
    c = await db["colleges"].find({}).to_list(10)
    for col in c:
        print(f"College: {col.get('name')} | ID: {col.get('college_id')}")



if __name__ == "__main__":
    asyncio.run(check())
