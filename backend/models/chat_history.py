"""models/chat_history.py"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ChatMessageModel(BaseModel):
    role: str   # "user" | "assistant"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    card_data: Optional[Dict[str, Any]] = None


class ChatHistoryModel(BaseModel):
    chat_id: str
    usn: str
    messages: List[ChatMessageModel] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
