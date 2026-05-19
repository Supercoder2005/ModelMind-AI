"""
Multi-Model Battle Engine.

Trains all models for the detected problem type in parallel using
concurrent.futures.ThreadPoolExecutor and returns structured results
for every model plus the determined winner.
"""
import time
import logging
import warnings
import numpy as np
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression, LinearRegression, Ridge, Lasso
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.decomposition import PCA
from sklearn.metrics import (
    accuracy_score, f1_score, precision_score, recall_score, roc_auc_score,
    mean_squared_error, mean_absolute_error, r2_score,
    silhouette_score, davies_bouldin_score, confusion_matrix,
)
import xgboost as xgb
import joblib
import os

warnings.filterwarnings("ignore")
logger = logging.getLogger(__name__)

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")


# ---------------------------------------------------------------------------
# Preprocessing helpers
# ---------------------------------------------------------------------------

def _preprocess(df: pd.DataFrame, target_col: str | None):
    """
    Basic preprocessing: encode categoricals, drop all-null cols.
    Returns X, y (y=None for clustering), and the fitted pipeline.
    """
    df = df.copy().dropna(axis=1, how="all")

    # Encode object columns
    for col in df.select_dtypes(include=["object", "category"]).columns:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str))

    if target_col and target_col in df.columns:
        X = df.drop(columns=[target_col])
        y = df[target_col]
    else:
        X = df
        y = None

    return X, y


def _split(X, y):
    return train_test_split(X, y, test_size=0.2, random_state=42)


# ---------------------------------------------------------------------------
# Classification
# ---------------------------------------------------------------------------

def _run_classification_model(name: str, model, X_train, X_test, y_train, y_test):
    t0 = time.time()
    pipe = Pipeline([("scaler", StandardScaler()), ("clf", model)])
    pipe.fit(X_train, y_train)
    y_pred = pipe.predict(X_test)
    elapsed = round(time.time() - t0, 3)

    # AUC-ROC (binary or multiclass OvR)
    try:
        if hasattr(pipe, "predict_proba"):
            y_prob = pipe.predict_proba(X_test)
            n_classes = len(np.unique(y_train))
            if n_classes == 2:
                auc = round(roc_auc_score(y_test, y_prob[:, 1]), 4)
            else:
                auc = round(roc_auc_score(y_test, y_prob, multi_class="ovr"), 4)
        else:
            auc = None
    except Exception:
        auc = None

    cm = confusion_matrix(y_test, y_pred).tolist()

    result = {
        "name": name,
        "accuracy": round(accuracy_score(y_test, y_pred), 4),
        "f1": round(f1_score(y_test, y_pred, average="weighted", zero_division=0), 4),
        "precision": round(precision_score(y_test, y_pred, average="weighted", zero_division=0), 4),
        "recall": round(recall_score(y_test, y_pred, average="weighted", zero_division=0), 4),
        "auc_roc": auc,
        "training_time_s": elapsed,
        "confusion_matrix": cm,
    }

    # Feature importances if available
    clf = pipe.named_steps["clf"]
    if hasattr(clf, "feature_importances_"):
        fi = dict(zip(X_train.columns.tolist(), clf.feature_importances_.round(4).tolist()))
        result["feature_importances"] = dict(sorted(fi.items(), key=lambda x: x[1], reverse=True)[:15])

    return result, pipe


def run_classification(df: pd.DataFrame, target_col: str, analysis_id: str):
    X, y = _preprocess(df, target_col)
    X_train, X_test, y_train, y_test = _split(X, y)

    models = {
        "Logistic Regression": LogisticRegression(max_iter=500, random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42),
        "SVM": SVC(probability=True, random_state=42),
        "Gradient Boosting": GradientBoostingClassifier(n_estimators=100, random_state=42),
    }

    results = []
    winner_pipe = None

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {
            executor.submit(_run_classification_model, name, model, X_train, X_test, y_train, y_test): name
            for name, model in models.items()
        }
        for future in as_completed(futures):
            try:
                res, pipe = future.result()
                results.append(res)
                if winner_pipe is None or res["f1"] > max(r["f1"] for r in results[:-1] or [{"f1": -1}]):
                    winner_pipe = (pipe, res["name"])
            except Exception as e:
                logger.error("Model failed: %s — %s", futures[future], e)

    results.sort(key=lambda r: r["f1"], reverse=True)
    winner_name = results[0]["name"]

    # Save winner model
    if winner_pipe:
        pipe_obj, pipe_name = winner_pipe
        # re-find the correct pipe
        pass
    _save_winner(models[winner_name], X_train, y_train, X, analysis_id)

    return {
        "problem_type": "classification",
        "models": results,
        "winner": winner_name,
        "target_col": target_col,
        "feature_names": X.columns.tolist(),
        "classes": sorted(y.unique().tolist()),
        "test_size": len(X_test),
    }


# ---------------------------------------------------------------------------
# Regression
# ---------------------------------------------------------------------------

def _run_regression_model(name: str, model, X_train, X_test, y_train, y_test):
    t0 = time.time()
    pipe = Pipeline([("scaler", StandardScaler()), ("reg", model)])
    pipe.fit(X_train, y_train)
    y_pred = pipe.predict(X_test)
    elapsed = round(time.time() - t0, 3)

    rmse = round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4)
    result = {
        "name": name,
        "rmse": rmse,
        "mae": round(float(mean_absolute_error(y_test, y_pred)), 4),
        "r2": round(float(r2_score(y_test, y_pred)), 4),
        "training_time_s": elapsed,
        "y_test": y_test.tolist()[:200],
        "y_pred": y_pred.tolist()[:200],
    }

    reg = pipe.named_steps["reg"]
    if hasattr(reg, "feature_importances_"):
        fi = dict(zip(X_train.columns.tolist(), reg.feature_importances_.round(4).tolist()))
        result["feature_importances"] = dict(sorted(fi.items(), key=lambda x: x[1], reverse=True)[:15])

    return result, pipe


def run_regression(df: pd.DataFrame, target_col: str, analysis_id: str):
    X, y = _preprocess(df, target_col)
    X_train, X_test, y_train, y_test = _split(X, y)

    models = {
        "Linear Regression": LinearRegression(),
        "Ridge": Ridge(alpha=1.0),
        "Lasso": Lasso(alpha=0.1, max_iter=2000),
        "XGBoost": xgb.XGBRegressor(n_estimators=100, random_state=42, verbosity=0),
    }

    results = []
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {
            executor.submit(_run_regression_model, name, model, X_train, X_test, y_train, y_test): name
            for name, model in models.items()
        }
        for future in as_completed(futures):
            try:
                res, _ = future.result()
                results.append(res)
            except Exception as e:
                logger.error("Regression model failed: %s — %s", futures[future], e)

    results.sort(key=lambda r: r["rmse"])
    winner_name = results[0]["name"]
    _save_winner(models[winner_name], X_train, y_train, X, analysis_id)

    return {
        "problem_type": "regression",
        "models": results,
        "winner": winner_name,
        "target_col": target_col,
        "feature_names": X.columns.tolist(),
        "test_size": len(X_test),
    }


# ---------------------------------------------------------------------------
# Clustering
# ---------------------------------------------------------------------------

def _elbow_k(X_scaled: np.ndarray) -> int:
    """Find best k via silhouette score (k = 2..8)."""
    best_k, best_score = 2, -1
    for k in range(2, min(9, len(X_scaled) // 5 + 1)):
        try:
            labels = KMeans(n_clusters=k, random_state=42, n_init="auto").fit_predict(X_scaled)
            score = silhouette_score(X_scaled, labels)
            if score > best_score:
                best_score, best_k = score, k
        except Exception:
            pass
    return best_k


def run_clustering(df: pd.DataFrame, analysis_id: str):
    X, _ = _preprocess(df, None)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    best_k = _elbow_k(X_scaled)

    results = []

    # K-Means
    t0 = time.time()
    km = KMeans(n_clusters=best_k, random_state=42, n_init="auto")
    km_labels = km.fit_predict(X_scaled)
    km_sil = round(float(silhouette_score(X_scaled, km_labels)), 4)
    results.append({
        "name": "K-Means",
        "k": best_k,
        "silhouette": km_sil,
        "davies_bouldin": round(float(davies_bouldin_score(X_scaled, km_labels)), 4),
        "inertia": round(float(km.inertia_), 2),
        "training_time_s": round(time.time() - t0, 3),
        "labels": km_labels.tolist(),
    })

    # DBSCAN
    t0 = time.time()
    db = DBSCAN(eps=0.5, min_samples=5)
    db_labels = db.fit_predict(X_scaled)
    n_clusters_db = len(set(db_labels)) - (1 if -1 in db_labels else 0)
    try:
        db_sil = round(float(silhouette_score(X_scaled, db_labels)), 4) if n_clusters_db > 1 else -1.0
    except Exception:
        db_sil = -1.0
    results.append({
        "name": "DBSCAN",
        "n_clusters": n_clusters_db,
        "silhouette": db_sil,
        "training_time_s": round(time.time() - t0, 3),
        "labels": db_labels.tolist(),
    })

    # Agglomerative
    t0 = time.time()
    agg = AgglomerativeClustering(n_clusters=best_k)
    agg_labels = agg.fit_predict(X_scaled)
    agg_sil = round(float(silhouette_score(X_scaled, agg_labels)), 4)
    results.append({
        "name": "Agglomerative",
        "k": best_k,
        "silhouette": agg_sil,
        "davies_bouldin": round(float(davies_bouldin_score(X_scaled, agg_labels)), 4),
        "training_time_s": round(time.time() - t0, 3),
        "labels": agg_labels.tolist(),
    })

    results.sort(key=lambda r: r["silhouette"], reverse=True)
    winner_name = results[0]["name"]
    winner_labels = results[0]["labels"]

    # PCA 2D for scatter
    pca = PCA(n_components=2, random_state=42)
    coords = pca.fit_transform(X_scaled)
    scatter_data = [
        {"x": round(float(coords[i, 0]), 4), "y": round(float(coords[i, 1]), 4), "cluster": int(winner_labels[i])}
        for i in range(len(coords))
    ]

    # Centroids for persona naming
    df_labeled = X.copy()
    df_labeled["_cluster"] = winner_labels
    centroids = df_labeled.groupby("_cluster").mean().round(4).to_dict()

    return {
        "problem_type": "clustering",
        "models": results,
        "winner": winner_name,
        "best_k": best_k,
        "scatter_data": scatter_data[:500],  # cap for response size
        "centroids": centroids,
        "feature_names": X.columns.tolist(),
    }


# ---------------------------------------------------------------------------
# Time Series
# ---------------------------------------------------------------------------

def run_timeseries(df: pd.DataFrame, target_col: str, analysis_id: str):
    """
    Detect date column, set index, run ARIMA + NeuralProphet (lightweight Prophet alternative).
    """
    from statsmodels.tsa.statespace.sarimax import SARIMAX
    from statsmodels.tsa.stattools import adfuller

    # Find datetime column
    date_col = None
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            date_col = col
            break
        try:
            pd.to_datetime(df[col])
            date_col = col
            break
        except Exception:
            pass

    if date_col:
        df[date_col] = pd.to_datetime(df[date_col])
        df = df.sort_values(date_col).set_index(date_col)

    series = df[target_col].dropna().astype(float)
    n = len(series)
    split = int(n * 0.8)
    train, test = series.iloc[:split], series.iloc[split:]

    results = []

    # ARIMA (p=1,d=1,q=1 baseline — fast for demo)
    t0 = time.time()
    try:
        arima_model = SARIMAX(train, order=(1, 1, 1)).fit(disp=False)
        arima_pred = arima_model.forecast(steps=len(test))
        rmse_arima = round(float(np.sqrt(mean_squared_error(test, arima_pred))), 4)
        mae_arima = round(float(mean_absolute_error(test, arima_pred)), 4)
        results.append({
            "name": "ARIMA(1,1,1)",
            "rmse": rmse_arima,
            "mae": mae_arima,
            "aic": round(float(arima_model.aic), 2),
            "training_time_s": round(time.time() - t0, 3),
            "y_test": test.tolist(),
            "y_pred": arima_pred.tolist(),
        })
    except Exception as e:
        logger.warning("ARIMA failed: %s", e)

    # NeuralProphet (lightweight, fast)
    t0 = time.time()
    try:
        from neuralprophet import NeuralProphet
        np_df = pd.DataFrame({"ds": series.index, "y": series.values})
        m = NeuralProphet(epochs=20, batch_size=16, learning_rate=0.1)
        m.fit(np_df.iloc[:split], freq="infer")
        future = m.make_future_dataframe(np_df.iloc[:split], periods=len(test))
        forecast = m.predict(future)
        yhat = forecast["yhat1"].iloc[-len(test):].values
        rmse_np = round(float(np.sqrt(mean_squared_error(test, yhat))), 4)
        mae_np = round(float(mean_absolute_error(test, yhat)), 4)
        results.append({
            "name": "NeuralProphet",
            "rmse": rmse_np,
            "mae": mae_np,
            "training_time_s": round(time.time() - t0, 3),
            "y_test": test.tolist(),
            "y_pred": yhat.tolist(),
        })
    except Exception as e:
        logger.warning("NeuralProphet failed: %s", e)

    if not results:
        raise ValueError("All time-series models failed.")

    results.sort(key=lambda r: r["rmse"])
    winner_name = results[0]["name"]

    # Full forecast data for chart
    forecast_data = [
        {"index": str(test.index[i]), "actual": float(test.iloc[i]), "predicted": float(results[0]["y_pred"][i])}
        for i in range(min(len(test), len(results[0]["y_pred"])))
    ]

    return {
        "problem_type": "timeseries",
        "models": results,
        "winner": winner_name,
        "target_col": target_col,
        "date_col": date_col,
        "forecast_data": forecast_data,
        "train_len": split,
        "test_len": len(test),
    }


# ---------------------------------------------------------------------------
# Dispatcher + helper
# ---------------------------------------------------------------------------

def _save_winner(model_cls, X_train, y_train, X_full, analysis_id: str):
    """Fit and pickle the winning model for What-If inference."""
    try:
        pipe = Pipeline([("scaler", StandardScaler()), ("model", model_cls)])
        pipe.fit(X_train, y_train)
        path = os.path.join(UPLOAD_DIR, f"{analysis_id}_model.pkl")
        joblib.dump(pipe, path)
        # Also save column order for What-If
        col_path = os.path.join(UPLOAD_DIR, f"{analysis_id}_columns.pkl")
        joblib.dump(X_full.columns.tolist(), col_path)
    except Exception as e:
        logger.warning("Could not save winner model: %s", e)


def run_all(df: pd.DataFrame, problem_type: str, target_col: str | None, analysis_id: str) -> dict:
    """Main dispatcher called by the /models/run router."""
    pt = problem_type.lower()

    # Validate target column for supervised tasks
    if pt in ("classification", "regression", "timeseries", "time-series", "time_series"):
        if not target_col:
            raise ValueError(f"Target column is required for {problem_type} tasks.")
        if target_col not in df.columns:
            raise ValueError(
                f"Target column '{target_col}' not found in the dataset. "
                f"Available columns: {df.columns.tolist()}"
            )

    if pt == "classification":
        return run_classification(df, target_col, analysis_id)
    elif pt == "regression":
        return run_regression(df, target_col, analysis_id)
    elif pt == "clustering":
        return run_clustering(df, analysis_id)
    elif pt in ("timeseries", "time-series", "time_series"):
        return run_timeseries(df, target_col, analysis_id)
    else:
        raise ValueError(f"Unknown problem type: {problem_type}")
