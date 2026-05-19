"""
POST /api/v1/whatif/predict

Loads the pickled winning model for an analysis and runs inference
on user-supplied input values.
"""
import os
import logging
import numpy as np
import pandas as pd
import joblib
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Analysis

logger = logging.getLogger(__name__)
router = APIRouter()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")


class WhatIfPayload(BaseModel):
    analysis_id: str
    input_values: dict   # {col_name: value}


@router.post("/whatif/predict")
def whatif_predict(payload: WhatIfPayload, db: Session = Depends(get_db)):
    record = db.query(Analysis).filter(Analysis.id == payload.analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found.")

    model_path = os.path.join(UPLOAD_DIR, f"{payload.analysis_id}_model.pkl")
    col_path = os.path.join(UPLOAD_DIR, f"{payload.analysis_id}_columns.pkl")

    if not os.path.exists(model_path):
        raise HTTPException(status_code=422, detail="Trained model not found. Run model training first.")

    try:
        pipe = joblib.load(model_path)
        columns = joblib.load(col_path) if os.path.exists(col_path) else list(payload.input_values.keys())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not load model: {e}")

    # Build input DataFrame with correct column order
    input_dict = {col: [payload.input_values.get(col, 0)] for col in columns}
    X_input = pd.DataFrame(input_dict)

    # Encode string columns
    for col in X_input.select_dtypes(include=["object"]).columns:
        X_input[col] = 0   # unknown category — encode as 0

    try:
        prediction = pipe.predict(X_input)
        pred_value = prediction[0]

        response: dict = {
            "prediction": float(pred_value) if not isinstance(pred_value, str) else pred_value,
        }

        # Classification: add probabilities if available
        if record.problem_type == "classification" and hasattr(pipe, "predict_proba"):
            proba = pipe.predict_proba(X_input)[0]
            classes = pipe.classes_.tolist() if hasattr(pipe, "classes_") else list(range(len(proba)))
            response["probabilities"] = [
                {"class": str(c), "probability": round(float(p), 4)}
                for c, p in zip(classes, proba)
            ]

        return response

    except Exception as e:
        logger.error("What-If inference failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}")
