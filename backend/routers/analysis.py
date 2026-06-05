"""
GET  /api/v1/analysis        — list recent analyses
GET  /api/v1/analysis/{id}   — get single analysis
PATCH /api/v1/analysis/{id}  — update name / is_favorite
DELETE /api/v1/analysis/{id} — delete analysis + files
GET  /api/v1/stats           — usage stats
"""
import os
import math
import logging
import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from db.database import get_db
from db.models import Analysis
from services.gemini_client import gemini

logger = logging.getLogger(__name__)
router = APIRouter()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")


def sanitize_json_floats(obj):
    if pd.isna(obj) if isinstance(obj, (float, np.floating, str, type(None))) or str(type(obj)) == "<class 'pandas._libs.missing.NAType'>" else False:
        return None
    if isinstance(obj, (float, np.floating)):
        f = float(obj)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    elif isinstance(obj, (int, np.integer)):
        return int(obj)
    elif isinstance(obj, dict):
        return {k: sanitize_json_floats(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_json_floats(x) for x in obj]
    elif isinstance(obj, tuple):
        return tuple(sanitize_json_floats(x) for x in obj)
    return obj


def _to_dict(a: Analysis) -> dict:
    return {
        "id": a.id,
        "filename": a.filename,
        "created_at": (a.created_at.isoformat() + "Z") if a.created_at else None,
        "domain": a.domain,
        "problem_type": a.problem_type,
        "shape_rows": a.shape_rows,
        "shape_cols": a.shape_cols,
        "target_col": a.target_col,
        "winning_model": a.winning_model,
        "name": a.name,
        "is_favorite": a.is_favorite,
        "user_goals": a.user_goals,
        "eda_result": sanitize_json_floats(a.eda_result),
        "profile": sanitize_json_floats(a.profile),
        "results_json": sanitize_json_floats(a.results_json),
    }


@router.get("/analysis")
def list_analyses(limit: int = 10, db: Session = Depends(get_db)):
    records = (
        db.query(Analysis)
        .order_by(Analysis.created_at.desc())
        .limit(limit)
        .all()
    )
    return [_to_dict(r) for r in records]


@router.get("/analysis/{analysis_id}")
def get_analysis(analysis_id: str, db: Session = Depends(get_db)):
    record = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return _to_dict(record)


class PatchPayload(BaseModel):
    name: str | None = None
    is_favorite: bool | None = None
    user_goals: str | None = None


@router.patch("/analysis/{analysis_id}")
def patch_analysis(analysis_id: str, payload: PatchPayload, db: Session = Depends(get_db)):
    record = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    if payload.name is not None:
        record.name = payload.name
    if payload.is_favorite is not None:
        record.is_favorite = payload.is_favorite
    if payload.user_goals is not None:
        record.user_goals = payload.user_goals
    db.commit()
    return _to_dict(record)


@router.delete("/analysis/{analysis_id}")
def delete_analysis(analysis_id: str, db: Session = Depends(get_db)):
    record = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found.")

    # Remove files
    for suffix in ["", "_model.pkl", "_columns.pkl"]:
        fp = os.path.join(UPLOAD_DIR, f"{analysis_id}{suffix}.csv" if suffix == "" else f"{analysis_id}{suffix}")
        if os.path.exists(fp):
            try:
                os.remove(fp)
            except Exception as e:
                logger.warning("Could not remove %s: %s", fp, e)

    db.delete(record)
    db.commit()
    return {"success": True}


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total = db.query(Analysis).count()
    by_type = {}
    for pt in ["classification", "regression", "clustering", "timeseries"]:
        by_type[pt] = db.query(Analysis).filter(Analysis.problem_type == pt).count()
    return {
        "total_analyses": total,
        "by_problem_type": by_type,
    }


@router.get("/analysis/{analysis_id}/suggestions")
def get_suggestions(analysis_id: str, db: Session = Depends(get_db)):
    record = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    if not record.profile:
        raise HTTPException(status_code=422, detail="No profile data found. Please run EDA first.")

    # Return cached result if available
    if record.suggestions_cache:
        return record.suggestions_cache

    try:
        suggestions = gemini.get_suggestions(record.profile, record.domain)
        record.suggestions_cache = suggestions
        db.commit()
        return suggestions
    except Exception as e:
        logger.error("Failed to generate suggestions: %s", e)
        raise HTTPException(status_code=500, detail=f"Could not generate suggestions: {e}")


@router.get("/analysis/{analysis_id}/attributes")
def get_attributes(analysis_id: str, db: Session = Depends(get_db)):
    record = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    if not record.profile or "column_details" not in record.profile:
        raise HTTPException(status_code=422, detail="No profile data found.")

    # Return cached result if available
    if record.attributes_cache:
        return record.attributes_cache

    cols = []
    for col, detail in record.profile["column_details"].items():
        cols.append({
            "name": col,
            "dtype": detail.get("dtype"),
            "unique_count": detail.get("unique_count"),
            "sample_values": list(detail.get("top_values", {}).keys())[:3] if "top_values" in detail else [detail.get("mean"), detail.get("min"), detail.get("max")]
        })

    try:
        explanations = gemini.explain_attributes(cols, record.domain)
        record.attributes_cache = explanations
        db.commit()
        return explanations
    except Exception as e:
        logger.error("Failed to explain attributes: %s", e)
        raise HTTPException(status_code=500, detail=f"Could not explain attributes: {e}")


@router.get("/analysis/{analysis_id}/conclusion")
def get_conclusion(analysis_id: str, db: Session = Depends(get_db)):
    record = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    if not record.results_json:
        raise HTTPException(status_code=422, detail="No training results found. Please run the model competition first.")

    # Return cached result if available
    if record.conclusion_cache:
        return record.conclusion_cache

    try:
        conclusion = gemini.generate_conclusion(record.results_json, record.domain)
        record.conclusion_cache = conclusion
        db.commit()
        return conclusion
    except Exception as e:
        logger.error("Failed to generate conclusion: %s", e)
        raise HTTPException(status_code=500, detail=f"Could not generate conclusion: {e}")
