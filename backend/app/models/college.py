from pydantic import BaseModel
from typing import Optional


class College(BaseModel):
    college_id: str
    name: str
    location: Optional[str] = None
    established: Optional[int] = None
