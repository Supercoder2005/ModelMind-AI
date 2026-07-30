"""
POST /api/v1/whatif/predict

Loads the pickled winning model for an analysis and runs inference
on user-supplied input values, properly encoding categorical features.
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
    enc_path = os.path.join(UPLOAD_DIR, f"{payload.analysis_id}_encoders.pkl")

    if not os.path.exists(model_path):
        raise HTTPException(status_code=422, detail="Trained model not found. Run model training first.")

    try:
        pipe = joblib.load(model_path)
        columns = joblib.load(col_path) if os.path.exists(col_path) else list(payload.input_values.keys())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not load model: {e}")

    # Load encoders if available
    encoders: dict = {}
    if os.path.exists(enc_path):
        try:
            encoders = joblib.load(enc_path)
        except Exception as e:
            logger.warning("Could not load encoders: %s", e)

    # Build input DataFrame with correct column order
    input_dict: dict = {}
    for col in columns:
        raw_val = payload.input_values.get(col, None)

        if col in encoders:
            # Categorical column — encode using the saved LabelEncoder
            le = encoders[col]
            str_val = str(raw_val) if raw_val is not None else ""
            # Handle unseen categories gracefully
            if str_val in le.classes_:
                encoded_val = int(le.transform([str_val])[0])
            else:
                # Use mode class (index 0 of sorted classes)
                logger.warning("Unseen category '%s' for column '%s', using 0", str_val, col)
                encoded_val = 0
            input_dict[col] = [encoded_val]
        else:
            # Numeric column — convert to float
            try:
                input_dict[col] = [float(raw_val) if raw_val is not None else 0.0]
            except (TypeError, ValueError):
                input_dict[col] = [0.0]

    X_input = pd.DataFrame(input_dict)

    logger.info("What-If input:\n%s", X_input.to_dict(orient="records"))

    try:
        prediction = pipe.predict(X_input)
        pred_value = prediction[0]

        response: dict = {
            "prediction": float(pred_value) if not isinstance(pred_value, (str, np.str_)) else str(pred_value),
            "input_summary": {col: X_input[col].iloc[0] for col in columns[:10]},
        }

        # Classification: add class probabilities if available
        if record.problem_type == "classification" and hasattr(pipe, "predict_proba"):
            try:
                proba = pipe.predict_proba(X_input)[0]
                classes = pipe.classes_.tolist() if hasattr(pipe, "classes_") else list(range(len(proba)))
                response["probabilities"] = [
                    {"class": str(c), "probability": round(float(p), 4)}
                    for c, p in zip(classes, proba)
                ]
            except Exception as e:
                logger.warning("Could not compute probabilities: %s", e)

        return response

    except Exception as e:
        logger.error("What-If inference failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}")
