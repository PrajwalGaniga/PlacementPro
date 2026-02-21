"""
ML Placement Predictor – loads placement_rf_model.pkl and scores a student.

Actual model features (19 total, one-hot encoded):
  0  Student_ID  (proxy: 0)
  1  Age
  2  CGPA
  3  Internships
  4  Projects
  5  Coding_Skills       (0-10)
  6  Communication_Skills (0-10)
  7  Aptitude_Test_Score  (0-10)
  8  Soft_Skills_Rating   (0-10)
  9  Certifications       (count)
  10 Backlogs
  11 Gender_Male          (1/0)
  12 Degree_B.Tech        (1/0)
  13 Degree_BCA           (1/0)
  14 Degree_MCA           (1/0)
  15 Branch_Civil         (1/0)
  16 Branch_ECE           (1/0)
  17 Branch_IT            (1/0)
  18 Branch_ME            (1/0)
"""
import os
import traceback
from typing import Optional

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "ml_model", "placement_rf_model.pkl")

_model = None
_model_loaded = False
_model_error: Optional[str] = None


def _load_model():
    global _model, _model_loaded, _model_error
    try:
        import joblib
        _model = joblib.load(MODEL_PATH)
        _model_loaded = True
        print(f"[ML ENGINE] ✅ Model loaded | features={_model.n_features_in_}")
    except Exception as e:
        _model_error = str(e)
        _model_loaded = False
        print(f"[ML ENGINE] ⚠️  Failed to load model: {e}")


_load_model()


def predict_score(
    cgpa: float,
    backlogs: int,
    branch: str,
    gender: str,
    skills: list,
    attendance_pct: float,
    mock_score: float,
    certifications: list,
    internships: int = 0,
    projects: int = 0,
    age: int = 21,
) -> float:
    """
    Returns a float 0–100 representing 'Placement Readiness'.
    Falls back to a heuristic if the ML model is unavailable.
    """
    if not _model_loaded or _model is None:
        print(f"[ML ENGINE] ⚠️  Model unavailable – using heuristic scorer")
        return _heuristic_score(cgpa, backlogs, skills, mock_score, attendance_pct, certifications)

    try:
        # Derived feature values
        coding_skill   = min(10, len([s for s in skills if s in
            ["Python","Java","C++","JavaScript","React","SQL","MongoDB","AWS",
             "Docker","TypeScript","C","Go","Rust","Node.js","Angular"]]))
        communication  = round(min(10, mock_score / 10), 1)
        aptitude       = round(min(10, attendance_pct / 10), 1)
        soft_skills    = round(min(10, (mock_score / 10 + attendance_pct / 10) / 2), 1)
        certs_count    = len(certifications)

        # One-hot encodings
        gender_male   = 1 if gender == "Male" else 0

        # Degree (default B.E/B.Tech → Degree_B.Tech=1, others 0)
        deg_btech = 1
        deg_bca   = 0
        deg_mca   = 0

        # Branch one-hot: Civil/ECE/IT/ME (CSE/ISE/CS/IS → all 0 = reference/base)
        branch_norm = branch.upper().strip().replace(" ", "")
        br_civil = 1 if branch_norm == "CIVIL" or branch_norm == "CE" else 0
        br_ece   = 1 if branch_norm in ("ECE", "EEE", "EE")          else 0
        br_it    = 1 if branch_norm in ("IS", "ISE", "IT")            else 0
        br_me    = 1 if branch_norm == "ME"                           else 0

        feature_vec = [[
            0,              # Student_ID (proxy)
            age,            # Age
            cgpa,           # CGPA
            internships,    # Internships
            projects,       # Projects
            coding_skill,   # Coding_Skills
            communication,  # Communication_Skills
            aptitude,       # Aptitude_Test_Score
            soft_skills,    # Soft_Skills_Rating
            certs_count,    # Certifications
            backlogs,       # Backlogs
            gender_male,    # Gender_Male
            deg_btech,      # Degree_B.Tech
            deg_bca,        # Degree_BCA
            deg_mca,        # Degree_MCA
            br_civil,       # Branch_Civil
            br_ece,         # Branch_ECE
            br_it,          # Branch_IT
            br_me,          # Branch_ME
        ]]

        pred = _model.predict_proba(feature_vec)
        # Binary classifier: class 1 = Placed
        score_pct = round(float(pred[0][1]) * 100, 1)
        return score_pct

    except Exception as e:
        print(f"[ML ENGINE] ⚠️  Prediction error: {e}\n{traceback.format_exc()}")
        return _heuristic_score(cgpa, backlogs, skills, mock_score, attendance_pct, certifications)


def _heuristic_score(cgpa, backlogs, skills, mock_score, attendance_pct, certifications) -> float:
    """Simple weighted heuristic when model is unavailable."""
    score = 0.0
    score += min(cgpa / 10.0, 1.0) * 35
    score += max(0.0, (10 - backlogs * 5) / 10) * 10
    score += min(len(skills) / 8.0, 1.0) * 20
    score += min(mock_score / 100.0, 1.0) * 20
    score += min(attendance_pct / 100.0, 1.0) * 10
    score += min(len(certifications) / 3.0, 1.0) * 5
    return round(score * 100, 1)
