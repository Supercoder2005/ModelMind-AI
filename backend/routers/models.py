"""
POST /api/v1/models/run

Triggers parallel multi-model training for a given analysis.
Updates the DB record with results and winning model.
"""
import logging
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Analysis
from services.ml_runner import run_all
from services.gemini_client import gemini

logger = logging.getLogger(__name__)
router = APIRouter()


class RunModelsPayload(BaseModel):
    analysis_id: str
    expertise_level: str = "practitioner"
    target_col: str | None = None   # override if user changes it


@router.post("/models/run")
def run_models(payload: RunModelsPayload, db: Session = Depends(get_db)):
    record = db.query(Analysis).filter(Analysis.id == payload.analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    if not record.file_path:
        raise HTTPException(status_code=422, detail="No CSV file associated with this analysis.")

    # Load CSV
    try:
        df = pd.read_csv(record.file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not read CSV: {e}")

    # Use user-supplied target or the one detected by Gemini
    target_col = payload.target_col or record.target_col
    problem_type = record.problem_type or "classification"

    # Run all models
    try:
        results = run_all(df, problem_type, target_col, payload.analysis_id)
    except Exception as e:
        logger.error("ML runner failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Model training failed: {e}")

    # Get Gemini explanation (check cache first)
    cache = record.explanations_cache or {}
    cache_key = payload.expertise_level

    if cache_key not in cache:
        try:
            explanation = gemini.explain(results, payload.expertise_level, record.domain)
            cache[cache_key] = explanation
        except Exception as e:
            logger.warning("Gemini explanation failed: %s", e)
            explanation = {"summary": "Explanation unavailable.", "actions": []}
            cache[cache_key] = explanation
    else:
        explanation = cache[cache_key]

    results["explanation"] = explanation

    # Cluster personas
    if problem_type == "clustering" and results.get("centroids"):
        try:
            personas = gemini.cluster_personas(results["centroids"], record.domain)
            results["cluster_personas"] = personas.get("clusters", [])
        except Exception as e:
            logger.warning("Cluster persona naming failed: %s", e)
            results["cluster_personas"] = []

    # Next steps
    try:
        next_steps = gemini.next_steps(results)
        results["next_steps"] = next_steps.get("steps", [])
    except Exception as e:
        logger.warning("Next steps generation failed: %s", e)
        results["next_steps"] = []

    # Persist to DB
    record.results_json = results
    record.winning_model = results.get("winner")
    record.explanations_cache = cache
    db.commit()

    return results
