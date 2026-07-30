"""
POST /api/v1/models/run        — blocking multi-model training
POST /api/v1/models/run-stream — SSE streaming training (models arrive live)

Triggers parallel multi-model training for a given analysis.
Updates the DB record with results and winning model.
"""
import json
import logging
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Analysis
from services.ml_runner import run_all, run_all_stream
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


@router.post("/models/run-stream")
def run_models_stream(payload: RunModelsPayload, db: Session = Depends(get_db)):
    """
    SSE endpoint — streams individual model results as they complete.
    The final 'done' event contains the full results summary.
    """
    record = db.query(Analysis).filter(Analysis.id == payload.analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    if not record.file_path:
        raise HTTPException(status_code=422, detail="No CSV file associated with this analysis.")

    try:
        df = pd.read_csv(record.file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not read CSV: {e}")

    target_col = payload.target_col or record.target_col
    problem_type = record.problem_type or "classification"
    analysis_id = payload.analysis_id
    expertise_level = payload.expertise_level
    domain = record.domain

    def event_generator():
        final_results = None

        for event in run_all_stream(df, problem_type, target_col, analysis_id):
            evt_type = event.get("event", "message")
            evt_data = event.get("data", "{}")
            yield f"event: {evt_type}\ndata: {evt_data}\n\n"

            if evt_type == "done":
                try:
                    final_results = json.loads(evt_data)
                except Exception:
                    pass

        # After streaming completes, add AI explanation + persist
        if final_results:
            try:
                explanation = gemini.explain(final_results, expertise_level, domain)
            except Exception as e:
                logger.warning("Gemini explanation failed in stream: %s", e)
                explanation = {"summary": "Explanation unavailable.", "actions": []}

            final_results["explanation"] = explanation

            # Next steps
            try:
                next_steps = gemini.next_steps(final_results)
                final_results["next_steps"] = next_steps.get("steps", [])
            except Exception:
                final_results["next_steps"] = []

            # Cluster personas
            if problem_type == "clustering" and final_results.get("centroids"):
                try:
                    personas = gemini.cluster_personas(final_results["centroids"], domain)
                    final_results["cluster_personas"] = personas.get("clusters", [])
                except Exception:
                    final_results["cluster_personas"] = []

            # Persist to DB
            try:
                from db.database import SessionLocal
                with SessionLocal() as sess:
                    rec = sess.query(Analysis).filter(Analysis.id == analysis_id).first()
                    if rec:
                        rec.results_json = final_results
                        rec.winning_model = final_results.get("winner")
                        cache = rec.explanations_cache or {}
                        cache[expertise_level] = explanation
                        rec.explanations_cache = cache
                        sess.commit()
            except Exception as e:
                logger.error("Could not persist stream results to DB: %s", e)

            # Emit enriched final event
            yield f"event: enriched\ndata: {json.dumps(final_results)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )
