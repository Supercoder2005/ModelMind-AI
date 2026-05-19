"""
GET /api/v1/export/notebook/{analysis_id}

Builds and streams a .ipynb file for the given analysis.
"""
import logging
import nbformat as nbf
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Analysis
from services.notebook_builder import build as build_notebook
from services.gemini_client import gemini

logger = logging.getLogger(__name__)
router = APIRouter()


def _analysis_to_dict(a: Analysis) -> dict:
    return {
        "id": a.id,
        "filename": a.filename,
        "domain": a.domain,
        "problem_type": a.problem_type,
        "shape_rows": a.shape_rows,
        "shape_cols": a.shape_cols,
        "target_col": a.target_col,
        "winning_model": a.winning_model,
        "eda_result": a.eda_result or {},
        "results_json": a.results_json or {},
        "profile": a.profile or {},
    }


@router.get("/export/notebook/{analysis_id}")
def export_notebook(analysis_id: str, db: Session = Depends(get_db)):
    record = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    if not record.results_json:
        raise HTTPException(status_code=422, detail="Run model training before exporting.")

    analysis_dict = _analysis_to_dict(record)

    # Generate Gemini commentary for notebook cells
    pipeline_steps = [
        "Import required Python libraries",
        "Load and preview the dataset",
        "Perform exploratory data analysis (EDA)",
        "Preprocess data: encode categoricals, split train/test",
        f"Train the winning model: {record.winning_model or 'best model'}",
        "Evaluate model performance with metrics and visualizations",
    ]

    commentary = None
    try:
        commentary = gemini.code_commentary(pipeline_steps, record.domain)
    except Exception as e:
        logger.warning("Code commentary generation failed: %s", e)

    # Build notebook
    nb = build_notebook(analysis_dict, commentary)
    notebook_str = nbf.writes(nb)

    safe_name = (record.name or record.filename or "analysis").replace(".csv", "").replace(" ", "_")
    filename = f"{safe_name}_modelmind.ipynb"

    return Response(
        content=notebook_str,
        media_type="application/x-ipynb+json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
