"""
GET  /api/v1/analysis        — list recent analyses
GET  /api/v1/analysis/{id}   — get single analysis
PATCH /api/v1/analysis/{id}  — update name / is_favorite
DELETE /api/v1/analysis/{id} — delete analysis + files
GET  /api/v1/stats           — usage stats
"""
import os
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from db.database import get_db
from db.models import Analysis

logger = logging.getLogger(__name__)
router = APIRouter()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")


def _to_dict(a: Analysis) -> dict:
    return {
        "id": a.id,
        "filename": a.filename,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "domain": a.domain,
        "problem_type": a.problem_type,
        "shape_rows": a.shape_rows,
        "shape_cols": a.shape_cols,
        "target_col": a.target_col,
        "winning_model": a.winning_model,
        "name": a.name,
        "is_favorite": a.is_favorite,
        "eda_result": a.eda_result,
        "profile": a.profile,
        "results_json": a.results_json,
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


@router.patch("/analysis/{analysis_id}")
def patch_analysis(analysis_id: str, payload: PatchPayload, db: Session = Depends(get_db)):
    record = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    if payload.name is not None:
        record.name = payload.name
    if payload.is_favorite is not None:
        record.is_favorite = payload.is_favorite
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
