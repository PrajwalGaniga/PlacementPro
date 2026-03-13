"""
utils/gemini_interface.py – All Google Gemini API calls in one place.
"""

import json
import re
from typing import List, Dict, Any, Optional

import google.generativeai as genai
from config import settings

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)

_PRO_MODEL = "gemini-1.5-pro"
_FLASH_MODEL = "gemini-1.5-flash"


def _clean_json(text: str) -> str:
    """Strip markdown code fences from model output."""
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _call(prompt: str, model_name: str = _FLASH_MODEL) -> str:
    model = genai.GenerativeModel("gemini-2.5-flash")
    response = model.generate_content(prompt)
    return response.text


# ── 1. JD PDF Parsing ─────────────────────────────────────────────────────────
def parse_jd_pdf(text: str) -> Dict[str, Any]:
    prompt = f"""Extract the following fields from this Job Description and return ONLY valid JSON.
Fields: company_name, job_role, package_ctc, work_location, bond_details, drive_date_time, venue,
min_cgpa (float), max_backlogs (int), eligible_branches (list of strings),
required_skills (list of strings), graduation_years (list of ints), industry_category, description.

If a field is not found, use null.

JD TEXT:
{text}

Return ONLY a valid JSON object, no explanation."""
    raw = _call(prompt)
    try:
        return json.loads(_clean_json(raw))
    except json.JSONDecodeError:
        return {"error": "parsing_failed", "raw": raw}


# ── 2. ATS Score ──────────────────────────────────────────────────────────────
def calculate_ats_score(resume_text: str, drive: Dict[str, Any]) -> float:
    jd_summary = f"""Job Role: {drive.get('job_role', '')}
Required Skills: {', '.join(drive.get('required_skills', []))}
Min CGPA: {drive.get('min_cgpa', 0)}
Job Description: {drive.get('job_description', '')[:500]}"""

    prompt = f"""Compare this resume with the job requirements and return ONLY a JSON object:
{{"ats_score": <number 0-100>, "matching_skills": [<list>], "missing_skills": [<list>], "summary": "<brief>"}}

RESUME:
{resume_text[:3000]}

JOB:
{jd_summary}

Return ONLY valid JSON."""
    raw = _call(prompt)
    try:
        result = json.loads(_clean_json(raw))
        score = float(result.get("ats_score", 50))
        return max(0.0, min(100.0, score))
    except Exception:
        return 50.0


# ── 3. Chat intent classification ─────────────────────────────────────────────
def classify_chat_intent(message: str) -> str:
    prompt = f"""Classify the user intent into one of: predict, compare, general.
- "predict": user wants to know their placement chance / score
- "compare": user asks why not selected, wants to compare with others, or company requirements
- "general": career advice, skills to learn, interview tips, etc.

Message: "{message}"

Return ONLY valid JSON: {{"intent": "<predict|compare|general>"}}"""
    raw = _call(prompt, _FLASH_MODEL)
    try:
        result = json.loads(_clean_json(raw))
        return result.get("intent", "general")
    except Exception:
        return "general"


# ── 4. General chat response ──────────────────────────────────────────────────
def generate_chat_response(
    message: str,
    student_context: Dict[str, Any],
    history: List[Dict[str, Any]]
) -> str:
    history_text = "\n".join(
        f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content']}"
        for m in history[-6:]
    )
    prompt = f"""You are PlacementBot V2, an AI career advisor for engineering students in India.

Student Profile:
- Name: {student_context.get('name', 'Student')}
- Branch: {student_context.get('branch', '')}
- CGPA: {student_context.get('cgpa', 'not set')}
- Skills: {', '.join(student_context.get('skills', [])[:10])}
- Backlogs: {student_context.get('backlogs', 0)}
- Placed: {student_context.get('placed', False)}

Recent conversation:
{history_text}

User message: {message}

Give a helpful, encouraging, and specific response. Use bullet points where helpful. Be concise."""
    return _call(prompt)


# ── 5. Compare student with placed students ───────────────────────────────────
def generate_comparison_response(
    message: str,
    student: Dict[str, Any],
    placed_students: List[Dict[str, Any]]
) -> Dict[str, Any]:

    # Compute averages
    if placed_students:
        avg_cgpa = sum(s.get("cgpa") or 0 for s in placed_students) / len(placed_students)
        all_skills: List[str] = []
        for s in placed_students:
            all_skills.extend(s.get("skills", []))
        from collections import Counter
        top_skills = [s for s, _ in Counter(all_skills).most_common(5)]
    else:
        avg_cgpa = 0.0
        top_skills = []

    student_skills = set(student.get("skills", []))
    top_skills_set = set(top_skills)
    similarities = list(student_skills & top_skills_set)
    gaps = list(top_skills_set - student_skills)

    prompt = f"""Student Profile CGPA: {student.get('cgpa')}, Skills: {list(student_skills)[:8]}
Average placed student CGPA: {avg_cgpa:.2f}, Top skills: {top_skills}
Similarities: {similarities}, Gaps: {gaps}

User message: "{message}"

Return ONLY valid JSON:
{{"action_steps": [<3 to 5 specific tips>], "summary": "<brief text>"}}"""
    raw = _call(prompt)
    try:
        result = json.loads(_clean_json(raw))
    except Exception:
        result = {"action_steps": ["Improve your technical skills", "Work on projects"], "summary": raw[:200]}

    return {
        "similarities": similarities,
        "gaps": gaps,
        "action_steps": result.get("action_steps", []),
        "avg_cgpa_placed": round(avg_cgpa, 2),
        "top_skills_placed": top_skills,
        "summary": result.get("summary", ""),
        "sample_count": len(placed_students),
    }


# ── 6. Placement data SWOT analysis ──────────────────────────────────────────
def analyze_placement_data(students: List[Dict[str, Any]]) -> Dict[str, Any]:
    placed = [s for s in students if s.get("placed")]
    unplaced = [s for s in students if not s.get("placed")]

    summary = {
        "total_students": len(students),
        "placed_count": len(placed),
        "unplaced_count": len(unplaced),
        "placement_rate": round(len(placed) / max(len(students), 1) * 100, 1),
        "avg_cgpa_placed": round(sum(s.get("cgpa") or 0 for s in placed) / max(len(placed), 1), 2),
        "avg_cgpa_unplaced": round(sum(s.get("cgpa") or 0 for s in unplaced) / max(len(unplaced), 1), 2),
    }

    prompt = f"""You are a placement analyst. Analyze this data and return a JSON object.

Placement Statistics:
{json.dumps(summary, indent=2)}

Return ONLY valid JSON with these exact keys:
{{
  "overview": "<2-3 sentence executive summary>",
  "winning_edge": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "critical_gaps": ["<gap 1>", "<gap 2>", "<gap 3>"],
  "action_plan": ["<action 1>", "<action 2>", "<action 3>", "<action 4>"]
}}"""
    raw = _call(prompt, _PRO_MODEL)
    try:
        result = json.loads(_clean_json(raw))
        result["raw_data_summary"] = summary
        return result
    except Exception:
        return {
            "overview": "Analysis in progress.",
            "winning_edge": ["Consistent CGPA data available"],
            "critical_gaps": ["Skill diversity needs improvement"],
            "action_plan": ["Conduct mock interviews", "Upskill in trending technologies"],
            "raw_data_summary": summary,
        }


# ── 7. AI Interview Scheduler sort ───────────────────────────────────────────
def smart_sort_applicants(
    applicants: List[Dict[str, Any]],
    drive: Dict[str, Any]
) -> List[Dict[str, Any]]:
    required_skills = set(drive.get("required_skills", []))

    def score(app: Dict[str, Any]) -> float:
        cgpa = app.get("cgpa") or 0
        ats = app.get("ats_score") or 0
        skill_match = len(set(app.get("skills", [])) & required_skills)
        return cgpa * 10 + ats * 0.5 + skill_match * 5

    return sorted(applicants, key=score, reverse=True)


# ── 8. AI summary for drive (used when student views eligible drives) ─────────
def generate_drive_summary(drive: Dict[str, Any]) -> str:
    prompt = f"""Write a 1-sentence exciting summary of this job opportunity for an engineering student:
Company: {drive.get('company_name')}, Role: {drive.get('job_role')}, 
Skills: {', '.join(drive.get('required_skills', [])[:5])}, Package: {drive.get('package_ctc')}
Return ONLY the sentence, nothing else."""
    try:
        return _call(prompt, _FLASH_MODEL)
    except Exception:
        return f"{drive.get('company_name', '')} is hiring for {drive.get('job_role', '')}."
