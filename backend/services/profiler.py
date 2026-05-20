"""
Dataset profiling service.

Takes a pandas DataFrame and returns a structured dict describing:
  - Shape, memory, duplicates
  - Per-column: dtype, missing, unique, stats or top values
"""
import pandas as pd
import numpy as np
from typing import Any


def profile(df: pd.DataFrame) -> dict[str, Any]:
    """
    Profile a DataFrame and return a JSON-serialisable dict.
    Caps string representations so Gemini prompt stays manageable.
    """
    result: dict[str, Any] = {}

    # --- Dataset-level ---
    result["shape"] = {"rows": int(df.shape[0]), "cols": int(df.shape[1])}
    result["memory_mb"] = round(df.memory_usage(deep=True).sum() / 1e6, 3)
    result["duplicate_rows"] = int(df.duplicated().sum())
    result["columns"] = list(df.columns)

    # --- Per-column ---
    columns_info = {}
    for col in df.columns:
        info: dict[str, Any] = {}
        info["dtype"] = str(df[col].dtype)
        info["missing_count"] = int(df[col].isna().sum())
        info["missing_pct"] = round(df[col].isna().mean() * 100, 2)
        info["unique_count"] = int(df[col].nunique())

        if pd.api.types.is_numeric_dtype(df[col]):
            desc = df[col].describe()
            info["mean"] = _safe_float(desc.get("mean"))
            info["std"] = _safe_float(desc.get("std"))
            info["min"] = _safe_float(desc.get("min"))
            info["max"] = _safe_float(desc.get("max"))
            info["q25"] = _safe_float(desc.get("25%"))
            info["q75"] = _safe_float(desc.get("75%"))
            info["skewness"] = _safe_float(df[col].skew())

            # Outlier detection using IQR
            q25_val = df[col].quantile(0.25)
            q75_val = df[col].quantile(0.75)
            iqr = q75_val - q25_val
            lower = q25_val - 1.5 * iqr
            upper = q75_val + 1.5 * iqr
            outlier_series = df[(df[col] < lower) | (df[col] > upper)][col]
            outliers_cnt = int(outlier_series.count())
            info["outliers_count"] = outliers_cnt
            info["outliers_pct"] = _safe_float(outliers_cnt / len(df) * 100) if len(df) > 0 else 0.0
        else:
            # Categorical / object — top 10 values
            top = df[col].value_counts().head(10)
            info["top_values"] = {str(k): int(v) for k, v in top.items()}

        # Class balance and distribution checks for potential target columns (categoricals or low-cardinality numerics)
        if not pd.api.types.is_numeric_dtype(df[col]) or info["unique_count"] <= 20:
            counts = df[col].value_counts()
            if len(counts) > 0:
                min_class_pct = (counts.min() / len(df)) * 100
                info["is_imbalanced"] = bool(min_class_pct < 15.0 and len(counts) > 1)
                info["class_distribution"] = {str(k): round(float(v / len(df) * 100), 2) for k, v in counts.head(10).items()}

        columns_info[col] = info

    result["column_details"] = columns_info

    # Sample for Gemini context (first 3 rows as list of dicts, stringified)
    result["sample_rows"] = df.head(3).astype(str).to_dict(orient="records")

    return result


def _safe_float(val) -> float | None:
    try:
        f = float(val)
        if np.isnan(f) or np.isinf(f):
            return None
        return round(f, 4)
    except Exception:
        return None


def get_column_meta(df: pd.DataFrame) -> dict:
    """
    Lightweight column metadata for the What-If form:
    {col: {dtype, min, max, unique_values (for categoricals)}}
    """
    meta = {}
    for col in df.columns:
        entry: dict[str, Any] = {"dtype": str(df[col].dtype)}
        if pd.api.types.is_numeric_dtype(df[col]):
            entry["min"] = _safe_float(df[col].min())
            entry["max"] = _safe_float(df[col].max())
        else:
            vals = df[col].dropna().unique().tolist()
            entry["unique_values"] = [str(v) for v in vals[:50]]  # cap at 50
        meta[col] = entry
    return meta
