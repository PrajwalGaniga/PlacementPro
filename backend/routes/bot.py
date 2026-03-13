"""
routes/bot.py – PlacementBot V2: Hybrid AI Career Analyzer.
"""

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import database as db
from utils.auth_utils import get_current_student
from utils.gemini_interface import (
    classify_chat_intent,
    generate_chat_response,
    generate_comparison_response,
)

router = APIRouter(prefix="/bot", tags=["PlacementBot"])


class ChatRequest(BaseModel):
    message: str


@router.post("/chat")
async def chat(body: ChatRequest, student_jwt: dict = Depends(get_current_student)):
    usn = student_jwt["usn"]
    message = body.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Fetch student profile
    student = await db.students().find_one({"usn": usn})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    student.pop("_id", None)
    student.pop("password_hash", None)

    # Fetch recent chat history
    history_doc = await db.chat_history().find_one({"usn": usn})
    history = (history_doc.get("messages", []) if history_doc else [])[-10:]

    # Step 1: Classify intent
    intent = classify_chat_intent(message)

    card_data = None
    response_text = ""
    response_type = intent

    if intent == "predict":
        # Use ML model
        try:
            import joblib, numpy as np
            from pathlib import Path
            model_path = Path(__file__).parent.parent / "ml_model" / "placement_model.pkl"
            model = joblib.load(str(model_path))
            cgpa = float(student.get("cgpa") or 6.0)
            backlogs = int(student.get("backlogs") or 0)
            skills = len(student.get("skills", []))
            projects = len(student.get("projects", []))
            experiences = len(student.get("experiences", []))
            features = np.array([[cgpa, backlogs, skills, projects, experiences]])
            prob = float(model.predict_proba(features)[0][1]) * 100
        except Exception:
            cgpa = float(student.get("cgpa") or 0)
            backlogs = int(student.get("backlogs") or 0)
            prob = min(
                cgpa / 10 * 40 + max(0, 20 - backlogs * 5) + min(len(student.get("skills", [])) * 2, 20),
                100
            )

        prob = round(prob, 1)
        if prob >= 75:
            text = f"Based on your profile, you have a **{prob}% placement probability**. 🚀 Keep it up!"
        elif prob >= 50:
            text = f"Your placement probability is **{prob}%**. 📈 There's room to improve — focus on skills and projects."
        else:
            text = f"Your current placement probability is **{prob}%**. 📚 Let's work on improving your CGPA, skills, and projects."

        response_text = text
        card_data = {
            "probability": prob,
            "cgpa": student.get("cgpa"),
            "coding_score": min(len(student.get("skills", [])) * 1.2, 10),
            "comm_score": 6.5,
            "projects": len(student.get("projects", [])),
            "backlogs": student.get("backlogs", 0),
        }
        response_type = "prediction"

    elif intent == "compare":
        # Fetch placed students from same college
        placed = await db.students().find(
            {"college_id": student.get("college_id"), "placed": True, "is_active": True}
        ).limit(50).to_list(None)
        for p in placed:
            p.pop("_id", None)
            p.pop("password_hash", None)

        comparison = generate_comparison_response(message, student, placed)
        response_text = comparison.get("summary", "Here's how your profile compares to placed students.")
        card_data = {
            "company": "placed students in your college",
            "data": {
                "similarities": comparison.get("similarities", []),
                "gaps": comparison.get("gaps", []),
                "action_steps": comparison.get("action_steps", []),
            },
            "ideal": {
                "avg_cgpa": comparison.get("avg_cgpa_placed", 0),
                "top_skills": comparison.get("top_skills_placed", []),
                "sample_count": comparison.get("sample_count", 0),
            },
            "student": {
                "cgpa": student.get("cgpa"),
                "skills": student.get("skills", []),
            },
        }
        response_type = "comparison"

    else:
        # General career advice
        response_text = generate_chat_response(message, student, history)
        response_type = "text"

    # Persist to chat history
    now = datetime.utcnow()
    user_msg = {"role": "user", "content": message, "timestamp": now.isoformat()}
    bot_msg = {"role": "assistant", "content": response_text, "timestamp": now.isoformat(), "card_data": card_data}

    if history_doc:
        await db.chat_history().update_one(
            {"usn": usn},
            {"$push": {"messages": {"$each": [user_msg, bot_msg]}}, "$set": {"updated_at": now}},
        )
    else:
        await db.chat_history().insert_one({
            "chat_id": str(uuid.uuid4()),
            "usn": usn,
            "messages": [user_msg, bot_msg],
            "created_at": now,
            "updated_at": now,
        })

    return {
        "text": response_text,
        "type": response_type,
        "card_data": card_data,
    }


@router.get("/history")
async def get_chat_history(student_jwt: dict = Depends(get_current_student)):
    doc = await db.chat_history().find_one({"usn": student_jwt["usn"]})
    if not doc:
        return {"messages": []}
    messages = doc.get("messages", [])[-20:]
    return {"messages": messages}
