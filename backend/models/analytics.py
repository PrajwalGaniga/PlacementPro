"""models/analytics.py"""
from datetime import datetime
from typing import List, Dict, Any
from pydantic import BaseModel, Field


class AnalyticsModel(BaseModel):
    analytics_id: str
    college_id: str
    generated_by: str
    analysis_type: str = "excel_swot"
    overview: str = ""
    winning_edges: List[str] = []
    critical_gaps: List[str] = []
    action_plan: List[str] = []
    raw_data_summary: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
