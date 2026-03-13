"""models/tpo.py"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class TPOModel(BaseModel):
    email: str
    password_hash: str
    name: str
    college_id: str
    is_super_admin: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
