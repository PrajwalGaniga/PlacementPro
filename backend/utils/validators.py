"""
utils/validators.py – Reusable input validators.
"""

from fastapi import HTTPException


def validate_pagination(page: int, limit: int) -> tuple[int, int]:
    if page < 1:
        raise HTTPException(status_code=400, detail="page must be >= 1")
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=400, detail="limit must be between 1 and 100")
    return page, limit


def paginate_skip(page: int, limit: int) -> int:
    return (page - 1) * limit


def total_pages(total: int, limit: int) -> int:
    return max(1, (total + limit - 1) // limit)
