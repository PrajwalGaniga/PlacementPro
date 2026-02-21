"""
PlacementBot V2 – Hybrid AI Career Analyzer
============================================
4-Layer Brain:
  Layer 0 – Intent Router (Gemini classifies: FAQ | PREDICT | COMPARE | ADVICE)
  Layer 1 – ML Predictor  (Scikit-learn Random Forest .pkl -> placement probability)
  Layer 2 – Comparative   (student vs. selected candidates from DB)
  Layer 3 – Advice / FAQ  (Gemini with student-context system prompt)
"""
import os, re, json, traceback
from pathlib import Path
from typing import Optional

import joblib
import pandas as pd
import google.generativeai as genai
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(prefix="/bot", tags=["PlacementBot"])

# ──────────────────────────────────────────────────────────────
# 1. Model loading (once at import time)
# ──────────────────────────────────────────────────────────────
_MODEL_PATHS = [
    Path(__file__).parent.parent.parent / "ml_model" / "placement_model.pkl",
    Path(__file__).parent.parent.parent / "ml_model" / "placement_rf_model.pkl",
]
_model = None
for _p in _MODEL_PATHS:
    if _p.exists():
        try:
            _model = joblib.load(_p)
            print(f"[PlacementBot] ML model loaded: {_p.name}")
        except Exception as e:
            print(f"[PlacementBot] Failed to load {_p.name}: {e}")
        break
if _model is None:
    print("[PlacementBot] ⚠️  No .pkl model found – ML prediction will fall back to Gemini")

# ──────────────────────────────────────────────────────────────
# 2. Gemini setup
# ──────────────────────────────────────────────────────────────
_GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
genai.configure(api_key=_GEMINI_KEY)
_gemini = genai.GenerativeModel("gemini-2.5-flash")

# ──────────────────────────────────────────────────────────────
# 3. Skill scorer (maps student skills list → 0-10 coding score)
# ──────────────────────────────────────────────────────────────
_SKILL_WEIGHTS = {
    # Level 3 – 3 pts each
    "python":3,"java":3,"react":3,"machine learning":3,"aws":3,
    "deep learning":3,"fastapi":3,"tensorflow":3,"pytorch":3,
    # Level 2 – 2 pts each
    "sql":2,"javascript":2,"node.js":2,"nodejs":2,"c++":2,
    "docker":2,"kotlin":2,"flutter":2,"mongodb":2,"spring":2,
    # Level 1 – 1 pt each
    "html":1,"css":1,"git":1,"linux":1,"bash":1,
}
_MAX_RAW = 20   # practical ceiling before normalisation

def _coding_score(skills: list[str]) -> float:
    raw = sum(_SKILL_WEIGHTS.get(s.lower().strip(), 0) for s in skills)
    return round(min(raw / _MAX_RAW * 10, 10), 2)

def _comm_score(experience: list | None) -> float:
    base = 7.0
    bonus = min(len(experience or []), 3) * 1.0   # up to +3
    return min(base + bonus, 10.0)

# ──────────────────────────────────────────────────────────────
# 4. Request / response schema
# ──────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str

# ──────────────────────────────────────────────────────────────
# 5. Intent router
# ──────────────────────────────────────────────────────────────
async def _classify_intent(message: str) -> str:
    prompt = (
        "Classify this student placement-related message into exactly ONE of "
        "[FAQ, PREDICT, COMPARE, ADVICE].\n"
        "Rules:\n"
        "- PREDICT: user asks about their placement chance, probability, likelihood\n"
        "- COMPARE: user asks why they were/weren't selected/placed in a company, "
        "or asks to compare their profile to selected students\n"
        "- FAQ: factual question about process, eligibility, deadlines, etc.\n"
        "- ADVICE: career tips, skill suggestions, interview prep, general guidance\n"
        f"Message: {message}\n"
        "Return ONLY the one-word category."
    )
    try:
        resp = await _gemini.generate_content_async(prompt)
        word = resp.text.strip().upper()
        for intent in ["PREDICT", "COMPARE", "ADVICE", "FAQ"]:
            if intent in word:
                return intent
    except Exception:
        pass
    return "ADVICE"

# ──────────────────────────────────────────────────────────────
# 6. Layer 2 – ML Prediction
# ──────────────────────────────────────────────────────────────
async def _layer_predict(student: dict) -> dict:
    """Run RandomForest and return placement probability."""
    coding  = _coding_score(student.get("skills", []))
    comm    = _comm_score(student.get("work_experience", []))
    cgpa    = float(student.get("cgpa", 0) or 0)
    projects= int(student.get("num_projects", 0) or 0)
    backlogs= int(student.get("backlogs", 0) or 0)

    if _model is not None:
        try:
            df = pd.DataFrame([[cgpa, comm, coding, projects, backlogs]],
                              columns=["CGPA","Communication_Skills","Coding_Skills","Projects","Backlogs"])
            proba = _model.predict_proba(df)[0]
            # assume class 1 = Placed
            placed_class_idx = list(_model.classes_).index(1) if 1 in _model.classes_ else -1
            probability = float(proba[placed_class_idx]) * 100 if placed_class_idx >= 0 else float(proba[-1]) * 100
            probability = round(probability, 1)
        except Exception as e:
            print(f"[PlacementBot] ML predict error: {e}")
            # Fallback: simple heuristic
            probability = _heuristic_probability(cgpa, coding, backlogs)
    else:
        probability = _heuristic_probability(cgpa, coding, backlogs)

    return {
        "type": "prediction",
        "probability": probability,
        "cgpa": cgpa,
        "coding_score": coding,
        "comm_score": comm,
        "projects": projects,
        "backlogs": backlogs,
    }

def _heuristic_probability(cgpa: float, coding: float, backlogs: int) -> float:
    """Simple fallback when model is unavailable."""
    score = (cgpa / 10) * 50 + (coding / 10) * 40 - (backlogs * 10)
    return round(max(5.0, min(99.0, score)), 1)

# ──────────────────────────────────────────────────────────────
# 7. Layer 3 – Comparative Analysis
# ──────────────────────────────────────────────────────────────
_COMPANY_RE = re.compile(
    r"\b(why|wasn.t|not|didn.t|missed|rejected|selected|placed|compare|vs|versus|analyzed?)\b.*?"
    r"(?:in|at|for|by|with)?\s+([A-Z][a-zA-Z0-9&.\- ]{2,30})",
    re.IGNORECASE,
)

def _extract_company(message: str) -> Optional[str]:
    m = _COMPANY_RE.search(message)
    if m:
        return m.group(2).strip()
    # Fallback: look for a capitalized proper noun after "in" / "at" / "for"
    m2 = re.search(r"\b(?:in|at|for)\s+([A-Z][a-zA-Z0-9&.\- ]{2,30})", message)
    return m2.group(1).strip() if m2 else None

async def _layer_compare(student: dict, message: str, db) -> dict:
    company = _extract_company(message)

    # ── Find drive ──────────────────────────────────────────────
    selected_profiles = []
    drive_skills: list[str] = []

    if company:
        drives_cursor = db["drives"].find(
            {"company_name": {"$regex": company, "$options": "i"}},
            {"_id": 1, "required_skills": 1, "company_name": 1},
        )
        drives = await drives_cursor.to_list(length=5)

        if drives:
            drive_ids = [d["_id"] for d in drives]
            drive_skills = drives[0].get("required_skills", [])

            # Fetch selected applications
            apps_cursor = db["applications"].find(
                {"drive_id": {"$in": drive_ids}, "status": "Selected"},
                {"student_usn": 1},
            )
            apps = await apps_cursor.to_list(length=50)

            if apps:
                usns = [a["student_usn"] for a in apps]
                stud_cursor = db["students"].find(
                    {"usn": {"$in": usns}},
                    {"cgpa": 1, "skills": 1, "num_projects": 1, "backlogs": 1},
                )
                sel_students = await stud_cursor.to_list(length=50)

                if sel_students:
                    avg_cgpa  = sum(s.get("cgpa", 0) for s in sel_students) / len(sel_students)
                    all_skills: dict[str, int] = {}
                    for s in sel_students:
                        for sk in s.get("skills", []):
                            all_skills[sk.lower()] = all_skills.get(sk.lower(), 0) + 1
                    top_skills = [k for k, _ in sorted(all_skills.items(), key=lambda x: -x[1])[:8]]
                    selected_profiles = [{
                        "avg_cgpa": round(avg_cgpa, 2),
                        "top_skills": top_skills,
                        "sample_count": len(sel_students),
                    }]

    # ── Build ideal profile if no real data ─────────────────────
    if not selected_profiles:
        selected_profiles = [{
            "avg_cgpa": 8.2,
            "top_skills": drive_skills or ["Python","SQL","Data Structures","Problem Solving","Communication"],
            "sample_count": 0,
            "note": "Mock ideal candidate (no placement data available for this company yet)",
        }]

    # ── Build Gemini comparison prompt ───────────────────────────
    student_summary = {
        "cgpa": student.get("cgpa"),
        "skills": student.get("skills", []),
        "projects": student.get("num_projects", 0),
        "backlogs": student.get("backlogs", 0),
        "experience": len(student.get("work_experience", [])),
    }
    ideal = selected_profiles[0]

    gemini_prompt = f"""
Compare the student profile against the ideal/selected candidate profile.
Student: {json.dumps(student_summary)}
Ideal/Selected: {json.dumps(ideal)}
Company: {company or "the company in question"}

Return STRICTLY valid JSON (no markdown, no explanation) in this exact schema:
{{
  "similarities": ["point 1", "point 2"],
  "gaps": ["gap 1", "gap 2"],
  "action_steps": ["step 1", "step 2", "step 3"]
}}
"""
    comparison_data = {"similarities": [], "gaps": [], "action_steps": []}
    try:
        resp = await _gemini.generate_content_async(gemini_prompt)
        raw_text = resp.text.strip()
        # Strip markdown fences if present
        raw_text = re.sub(r"^```[a-z]*\n?|\n?```$", "", raw_text, flags=re.MULTILINE).strip()
        comparison_data = json.loads(raw_text)
    except Exception as e:
        print(f"[PlacementBot] Gemini comparison error: {e}")
        comparison_data = {
            "similarities": [f"Both share an interest in {company or 'the role'}"],
            "gaps": ["Could not perform detailed analysis. Check your profile completeness."],
            "action_steps": ["Complete your profile", "Add more skills", "Increase project count"],
        }

    return {
        "type": "comparison",
        "company": company or "the company",
        "student": student_summary,
        "ideal": ideal,
        "data": comparison_data,
    }

# ──────────────────────────────────────────────────────────────
# 8. Layer 4 – Gemini contextual advice (FAQ / ADVICE)
# ──────────────────────────────────────────────────────────────
async def _layer_advice(student: dict, message: str) -> dict:
    name   = student.get("name", "the student")
    cgpa   = student.get("cgpa", "N/A")
    skills = ", ".join(student.get("skills", [])) or "not listed"
    branch = student.get("branch", "")
    backlog= student.get("backlogs", 0)
    projs  = student.get("num_projects", 0)

    system = (
        f"You are PlacementBot, an expert AI career coach inside the PlacementPro app. "
        f"You are advising {name}, a {branch} student with CGPA {cgpa}, "
        f"skills: [{skills}], {projs} project(s), and {backlog} backlog(s). "
        "Give concise, actionable, friendly advice in 3-5 sentences. "
        "Use bullet points or numbered lists when listing tips. "
        "Never say you are an AI. Address the student by first name."
    )
    try:
        resp = await _gemini.generate_content_async(f"[System]: {system}\n\nStudent: {message}")
        return {"type": "text", "text": resp.text.strip()}
    except Exception as e:
        return {"type": "text", "text": f"Sorry, I couldn't generate a response right now. ({e})"}

# ──────────────────────────────────────────────────────────────
# 9. Main chat endpoint
# ──────────────────────────────────────────────────────────────
@router.post("/chat")
async def chat(body: ChatRequest, current_user: dict = Depends(get_current_user)):
    message = body.message.strip()
    if not message:
        raise HTTPException(400, "Message cannot be empty")

    db = get_db()
    usn = current_user.get("usn") or current_user.get("sub")
    if not usn:
        raise HTTPException(401, "Could not identify student")

    # Fetch full student profile
    student = await db["students"].find_one({"usn": usn})
    if not student:
        # Return graceful fallback rather than crashing
        return {"type": "text", "text": "I couldn't find your profile. Please complete it in the Profile tab and try again!"}

    # ── Clean MongoDB ObjectId ──────────────────────────────────
    student["_id"] = str(student["_id"])

    try:
        # Layer 0: Intent routing
        intent = await _classify_intent(message)
        print(f"[PlacementBot] intent={intent} | msg={message[:60]}")

        if intent == "PREDICT":
            return await _layer_predict(student)
        elif intent == "COMPARE":
            return await _layer_compare(student, message, db)
        else:
            # FAQ and ADVICE both go to contextual Gemini
            return await _layer_advice(student, message)

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        # Never crash the server; always return a text response
        try:
            fallback = await _layer_advice(student, message)
        except Exception:
            fallback = {"type": "text", "text": "PlacementBot is temporarily unavailable. Please try again in a moment."}
        return fallback
