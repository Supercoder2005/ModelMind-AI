"""
POST /api/v1/upload

Accepts a CSV file + optional domain field.
Profiles the data, calls Gemini for problem detection, saves to DB.
"""
import os
import uuid
import logging
import pandas as pd
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Analysis
from services.profiler import profile as compute_profile
from services.gemini_client import gemini

logger = logging.getLogger(__name__)
router = APIRouter()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    domain: str | None = Form(None),
    db: Session = Depends(get_db),
):
    # ----- Validate file type -----
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    # ----- Save to disk -----
    analysis_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{analysis_id}.csv")
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # ----- Read with Pandas -----
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=422, detail=f"Could not parse CSV: {e}")

    if df.empty:
        os.remove(file_path)
        raise HTTPException(status_code=422, detail="CSV file is empty.")

    # ----- Profile -----
    data_profile = compute_profile(df)

    # ----- Gemini: problem detection -----
    try:
        eda_result = gemini.detect_problem(data_profile, domain)
    except Exception as e:
        logger.error("Gemini EDA failed: %s", e)
        # Fallback — don't crash the upload
        eda_result = {
            "problem_type": "classification",
            "target_col": None,
            "domain_guess": domain or "Unknown",
            "confidence": "low",
            "observations": ["Auto-detection failed. Please set problem type manually."],
            "narrative": "Could not connect to Gemini. Manual configuration required.",
        }

    # ----- Persist to DB -----
    record = Analysis(
        id=analysis_id,
        filename=file.filename,
        domain=domain or eda_result.get("domain_guess"),
        problem_type=eda_result.get("problem_type"),
        shape_rows=int(df.shape[0]),
        shape_cols=int(df.shape[1]),
        target_col=eda_result.get("target_col"),
        eda_result=eda_result,
        profile=data_profile,
        file_path=file_path,
        explanations_cache={},
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "analysis_id": analysis_id,
        "filename": file.filename,
        "shape": data_profile["shape"],
        "profile": data_profile,
        "eda_result": eda_result,
    }
