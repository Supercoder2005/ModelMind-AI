"""
GET  /api/v1/analysis/{id}/preprocess-info  — returns what preprocessing will be applied
GET  /api/v1/analysis/{id}/cleaned-data     — runs preprocessing and returns downloadable CSV
"""
import io
import os
import logging
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Analysis
from services.ml_runner import pipeline_preprocess_and_engineer

logger = logging.getLogger(__name__)
router = APIRouter()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")


@router.get("/analysis/{analysis_id}/preprocess-info")
def get_preprocess_info(analysis_id: str, db: Session = Depends(get_db)):
    """
    Returns what preprocessing operations WILL be applied (based on profile),
    plus actual logs if models have already been run.
    """
    record = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    if not record.profile:
        raise HTTPException(status_code=422, detail="No profile data found. Please upload a dataset first.")

    profile = record.profile
    column_details = profile.get("column_details", {})

    # Build what-will-happen summary from profile
    operations = []
    for col, detail in column_details.items():
        if col == record.target_col:
            continue
        missing = detail.get("missing_count", 0)
        if missing > 0:
            dtype = detail.get("dtype", "object")
            if "float" in dtype or "int" in dtype:
                operations.append({
                    "type": "imputation",
                    "column": col,
                    "description": f"Impute {missing} missing values in '{col}' using median (numeric)",
                    "status": "planned"
                })
            else:
                operations.append({
                    "type": "imputation",
                    "column": col,
                    "description": f"Impute {missing} missing values in '{col}' using mode (categorical)",
                    "status": "planned"
                })

    # Encoding operations
    for col, detail in column_details.items():
        if col == record.target_col:
            continue
        dtype = detail.get("dtype", "")
        if "object" in dtype or "category" in dtype:
            operations.append({
                "type": "encoding",
                "column": col,
                "description": f"Label-encode categorical column '{col}'",
                "status": "planned"
            })

    # Scaling — all numeric features
    numeric_cols = [c for c, d in column_details.items()
                    if c != record.target_col and ("float" in d.get("dtype", "") or "int" in d.get("dtype", ""))]
    if numeric_cols:
        operations.append({
            "type": "scaling",
            "column": "all numeric",
            "description": f"StandardScaler on {len(numeric_cols)} numeric feature(s): {', '.join(numeric_cols[:5])}{'...' if len(numeric_cols) > 5 else ''}",
            "status": "planned"
        })

    # Actual logs from a previous run
    actual_logs = []
    feat_logs = []
    if record.results_json:
        actual_logs = record.results_json.get("preprocessing_logs", [])
        feat_logs = record.results_json.get("feature_engineering_logs", [])

    return {
        "analysis_id": analysis_id,
        "target_col": record.target_col,
        "problem_type": record.problem_type,
        "planned_operations": operations,
        "actual_preprocessing_logs": actual_logs,
        "feature_engineering_logs": feat_logs,
        "models_run": bool(record.results_json),
    }


@router.get("/analysis/{analysis_id}/cleaned-data")
def download_cleaned_data(analysis_id: str, db: Session = Depends(get_db)):
    """
    Runs the preprocessing pipeline on the raw CSV and returns a downloadable cleaned CSV.
    """
    record = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    if not record.file_path:
        raise HTTPException(status_code=422, detail="No CSV file associated with this analysis.")

    try:
        df = pd.read_csv(record.file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not read CSV: {e}")

    target_col = record.target_col
    problem_type = record.problem_type or "classification"

    try:
        X, y, prep_logs, feat_logs = pipeline_preprocess_and_engineer(df, target_col, problem_type)
    except Exception as e:
        logger.error("Preprocessing failed for download: %s", e)
        raise HTTPException(status_code=500, detail=f"Preprocessing failed: {e}")

    # Reassemble cleaned DataFrame
    if y is not None:
        X[target_col] = y.values
    cleaned_df = X

    # Stream as CSV
    output = io.StringIO()
    cleaned_df.to_csv(output, index=False)
    output.seek(0)

    filename = record.filename.replace(".csv", "_cleaned.csv")

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
