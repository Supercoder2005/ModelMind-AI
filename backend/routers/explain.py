"""
POST /api/v1/explain

Re-generates Gemini explanation for an existing analysis at a given expertise level.
Uses cache: if the (analysis_id, expertise_level) pair already exists in DB, returns cached.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Analysis
from services.gemini_client import gemini

logger = logging.getLogger(__name__)
router = APIRouter()


class ExplainPayload(BaseModel):
    analysis_id: str
    expertise_level: str = "practitioner"
    force_refresh: bool = False   # bypass cache


@router.post("/explain")
def explain(payload: ExplainPayload, db: Session = Depends(get_db)):
    record = db.query(Analysis).filter(Analysis.id == payload.analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    if not record.results_json:
        raise HTTPException(status_code=422, detail="Run model training first.")

    cache = record.explanations_cache or {}
    cache_key = payload.expertise_level

    if cache_key in cache and not payload.force_refresh:
        return {"explanation": cache[cache_key], "cached": True}

    try:
        explanation = gemini.explain(record.results_json, payload.expertise_level, record.domain)
    except Exception as e:
        logger.error("Gemini explain failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Gemini API error: {e}")

    cache[cache_key] = explanation
    record.explanations_cache = cache
    db.commit()

    return {"explanation": explanation, "cached": False}
