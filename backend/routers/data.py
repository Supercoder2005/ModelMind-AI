"""
GET /api/v1/analysis/{id}/data — Return the full dataset rows for a given analysis
"""
import os
import math
import logging
import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Analysis

logger = logging.getLogger(__name__)
router = APIRouter()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")


def _safe_value(val):
    """Convert a value to a JSON-serializable format."""
    if val is None:
        return None
    if isinstance(val, (float, np.floating)):
        if math.isnan(val) or math.isinf(val):
            return None
        return float(val)
    if isinstance(val, (int, np.integer)):
        return int(val)
    return str(val)


@router.get("/analysis/{analysis_id}/data")
def get_dataset(
    analysis_id: str,
    limit: int = Query(default=1000, le=5000, description="Max rows to return"),
    db: Session = Depends(get_db),
):
    """
    Return the full dataset rows from the original CSV file.
    Includes metadata about which cells are missing, which rows are duplicates,
    and which column is the target.
    """
    record = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found.")

    if not record.file_path or not os.path.exists(record.file_path):
        # Try the default upload location
        default_path = os.path.join(UPLOAD_DIR, f"{analysis_id}.csv")
        if os.path.exists(default_path):
            file_path = default_path
        else:
            raise HTTPException(status_code=404, detail="Original CSV file not found on disk.")
    else:
        file_path = record.file_path

    try:
        df = pd.read_csv(file_path, nrows=limit)
    except Exception as e:
        logger.error("Failed to read CSV %s: %s", file_path, e)
        raise HTTPException(status_code=500, detail=f"Failed to read dataset: {e}")

    columns = df.columns.tolist()
    total_rows = len(df)

    # Identify duplicate rows (mark entire duplicate as duplicate; first occurrence is NOT a duplicate)
    duplicate_mask = df.duplicated(keep="first")

    # Build rows with metadata
    rows = []
    for idx, (_, row) in enumerate(df.iterrows()):
        row_data = {col: _safe_value(row[col]) for col in columns}
        missing_cells = [col for col in columns if pd.isna(row[col])]
        rows.append({
            "idx": idx,
            "data": row_data,
            "is_duplicate": bool(duplicate_mask.iloc[idx]),
            "missing_cells": missing_cells,
        })

    # Column metadata
    col_meta = {}
    for col in columns:
        col_meta[col] = {
            "dtype": str(df[col].dtype),
            "missing_count": int(df[col].isna().sum()),
            "is_target": col == record.target_col,
        }

    return {
        "analysis_id": analysis_id,
        "filename": record.filename,
        "target_col": record.target_col,
        "columns": columns,
        "column_meta": col_meta,
        "total_rows": total_rows,
        "rows": rows,
    }
