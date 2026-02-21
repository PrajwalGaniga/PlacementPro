from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import pandas as pd
import logging
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PlacementPro API")

# Allow all CORS origins (development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StudentInput(BaseModel):
    CGPA: float = Field(..., ge=0.0, le=10.0)
    Communication_Skills: int = Field(..., ge=0, le=10)
    Coding_Skills: int = Field(..., ge=0, le=10)
    Projects: int = Field(..., ge=0)
    Backlogs: int = Field(..., ge=0)


# Load model
_model: Optional[object] = None
try:
    _model = joblib.load("placement_rf_model.pkl")
    logger.info("Loaded model: placement_rf_model.pkl")
except FileNotFoundError:
    logger.exception("Model file not found: placement_rf_model.pkl")
    _model = None
except Exception:
    logger.exception("Failed loading model")
    _model = None


def _ensure_model():
    if _model is None:
        raise HTTPException(status_code=500, detail="Model file not found: placement_rf_model.pkl")


def _feature_order():
    try:
        return list(_model.feature_names_in_)
    except Exception:
        return ["CGPA", "Communication_Skills", "Coding_Skills", "Projects", "Backlogs"]


def _risk_from_score(score: float) -> str:
    if score < 40:
        return "HIGH"
    if score <= 70:
        return "MEDIUM"
    return "LOW"


@app.get("/")
def health():
    return {"status": "ok", "model_loaded": _model is not None}


@app.post("/predict")
def predict(input: StudentInput):
    _ensure_model()

    # To DataFrame
    df = pd.DataFrame([input.dict()])

    # Reindex based on training order
    features = _feature_order()
    df = df.reindex(columns=features, fill_value=0)

    try:
        probs = _model.predict_proba(df)
    except Exception as e:
        logger.exception("Prediction failed")
        raise HTTPException(status_code=500, detail=f"Prediction error: {e}")

    placement_prob = float(probs[0][1]) if probs.shape[1] > 1 else float(probs[0][0])
    readiness_score = placement_prob * 100.0
    risk_level = _risk_from_score(readiness_score)

    return {
        "placement_probability": placement_prob,
        "readiness_score": readiness_score,
        "risk_level": risk_level,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)    is this code is enough for backend ? 