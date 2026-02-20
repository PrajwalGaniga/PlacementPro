from fastapi import APIRouter, HTTPException, Depends, Query
from app.database import get_db
from app.utils.auth import get_current_user
from typing import Optional, List

router = APIRouter(prefix="/student", tags=["Student"])


@router.get("/list")
async def list_students(
    branch: Optional[str] = Query(None),
    placed: Optional[bool] = Query(None),
    min_cgpa: Optional[float] = Query(None),
    graduation_year: Optional[int] = Query(None),
    gender: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """List students with optional filters (branch, placed, cgpa, batch year, gender)."""
    try:
        db = get_db()
        college_id = current_user.get("college_id")
        query: dict = {"college_id": college_id}

        if branch:
            query["branch"] = branch
        if placed is not None:
            query["placed"] = placed
        if min_cgpa is not None:
            query["cgpa"] = {"$gte": min_cgpa}
        if graduation_year is not None:
            query["graduation_year"] = graduation_year
        if gender:
            query["gender"] = gender

        students = await db["students"].find(
            query, {"_id": 0}
        ).sort("name", 1).to_list(length=500)

        # Enrich with batch_label
        for s in students:
            gy = s.get("graduation_year", 2025)
            s["batch_label"] = f"{gy - 1}-{str(gy)[2:]}"

        return students
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch students: {str(e)}")


@router.get("/stats")
async def student_stats(current_user: dict = Depends(get_current_user)):
    """Branch-wise breakdown for the college."""
    try:
        db = get_db()
        college_id = current_user.get("college_id")
        pipeline = [
            {"$match": {"college_id": college_id}},
            {
                "$group": {
                    "_id": "$branch",
                    "count": {"$sum": 1},
                    "placed": {"$sum": {"$cond": ["$placed", 1, 0]}},
                    "avg_cgpa": {"$avg": "$cgpa"},
                }
            },
            {"$sort": {"_id": 1}},
        ]
        result = await db["students"].aggregate(pipeline).to_list(length=20)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")


@router.get("/batches")
async def list_batches(current_user: dict = Depends(get_current_user)):
    """Return distinct graduation years for batch filter dropdown."""
    try:
        db = get_db()
        college_id = current_user.get("college_id")
        years = await db["students"].distinct("graduation_year", {"college_id": college_id})
        return sorted([y for y in years if y])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list batches: {str(e)}")


@router.put("/{usn}/mark-placed")
async def mark_placed(usn: str, current_user: dict = Depends(get_current_user)):
    try:
        db = get_db()
        result = await db["students"].update_one(
            {"usn": usn, "college_id": current_user.get("college_id")},
            {"$set": {"placed": True}},
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Student not found")
        return {"message": "Student marked as placed"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update: {str(e)}")
