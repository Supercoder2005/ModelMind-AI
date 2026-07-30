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

from sklearn.model_selection import train_test_split, cross_val_score
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
# Preprocessing & Feature Engineering helpers
# ---------------------------------------------------------------------------

def pipeline_preprocess_and_engineer(df: pd.DataFrame, target_col: str | None, problem_type: str):
    """
    Standard pipeline:
    1. Clean (impute missing)
    2. Feature creation (extract date features, numeric interactions)
    3. Encode categoricals
    4. Feature selection (drop highly correlated features)
    5. Scale numeric columns
    
    Returns: X, y, preprocessing_logs, feature_logs
    """
    df = df.copy()
    preprocessing_logs = []
    feature_logs = []

    # 1. Clean missing values
    for col in df.columns:
        if col == target_col:
            continue
        missing = df[col].isna().sum()
        if missing > 0:
            if pd.api.types.is_numeric_dtype(df[col]):
                median = df[col].median()
                df[col] = df[col].fillna(median)
                preprocessing_logs.append(f"Imputed {missing} missing values in '{col}' using median ({median})")
            else:
                mode = df[col].mode().iloc[0] if not df[col].mode().empty else "Unknown"
                df[col] = df[col].fillna(mode)
                preprocessing_logs.append(f"Imputed {missing} missing values in '{col}' using mode ({mode})")

    # 2. Feature creation
    # Extract date features
    for col in df.columns:
        if col == target_col:
            continue
        if pd.api.types.is_datetime64_any_dtype(df[col]) or str(df[col].dtype) == "object":
            try:
                converted = pd.to_datetime(df[col], errors='raise')
                df[f"{col}_year"] = converted.dt.year
                df[f"{col}_month"] = converted.dt.month
                df[f"{col}_day"] = converted.dt.day
                df[f"{col}_dayofweek"] = converted.dt.dayofweek
                df = df.drop(columns=[col])
                feature_logs.append(f"Extracted year, month, day, dayofweek from date column '{col}'")
            except Exception:
                pass

    # Numeric interactions (create interactions for top 3 highest variance numeric columns)
    if problem_type in ("classification", "regression"):
        numeric_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c]) and c != target_col]
        # Only synthesize features if we have a decent number of base features, otherwise it's irrelevant
        if len(numeric_cols) >= 6:
            variances = df[numeric_cols].var().sort_values(ascending=False)
            top_var_cols = variances.index.tolist()[:3]
            if len(top_var_cols) >= 2:
                col1, col2 = top_var_cols[0], top_var_cols[1]
                new_col = f"{col1}_x_{col2}"
                df[new_col] = df[col1] * df[col2]
                feature_logs.append(f"Created interaction term '{new_col}' = {col1} * {col2}")

    # 3. Encode categoricals
    for col in df.columns:
        if col == target_col:
            continue
        if pd.api.types.is_numeric_dtype(df[col]) is False:
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col].astype(str))
            preprocessing_logs.append(f"Encoded categorical column '{col}' using LabelEncoder")

    if target_col and target_col in df.columns:
        X = df.drop(columns=[target_col])
        y = df[target_col]
        if problem_type == "classification" and not pd.api.types.is_numeric_dtype(y):
            le_target = LabelEncoder()
            y = pd.Series(le_target.fit_transform(y.astype(str)), index=y.index)
            preprocessing_logs.append(f"Encoded target column '{target_col}' for classification")
    else:
        X = df
        y = None

    # 4. Drop highly correlated features (collinearity selection)
    # Only drop collinear features if the feature space is large enough to afford losing them
    if len(X.columns) >= 6:
        corr_matrix = X.corr().abs()
        upper_tri = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
        to_drop = [column for column in upper_tri.columns if any(upper_tri[column] > 0.85)]
        if to_drop:
            X = X.drop(columns=to_drop)
            feature_logs.append(f"Dropped collinear features (>0.85 correlation): {', '.join(to_drop)}")

    # 5. Scale numeric columns
    numeric_cols_final = [c for c in X.columns if pd.api.types.is_numeric_dtype(X[c])]
    if numeric_cols_final:
        scaler = StandardScaler()
        X[numeric_cols_final] = scaler.fit_transform(X[numeric_cols_final])
        preprocessing_logs.append(f"Scaled numeric features with StandardScaler: {', '.join(numeric_cols_final)}")

    return X, y, preprocessing_logs, feature_logs


def pipeline_train_val_test_split(X, y):
    """
    Split into Train (70%), Val (15%), and Test (15%).
    """
    if y is None:
        n = len(X)
        indices = np.random.permutation(n)
        train_idx = indices[:int(n * 0.7)]
        val_idx = indices[int(n * 0.7):int(n * 0.85)]
        test_idx = indices[int(n * 0.85):]
        return X.iloc[train_idx], X.iloc[val_idx], X.iloc[test_idx], None, None, None

    X_temp, X_test, y_temp, y_test = train_test_split(X, y, test_size=0.15, random_state=42)
    # 0.15 / 0.85 = 0.17647
    X_train, X_val, y_train, y_val = train_test_split(X_temp, y_temp, test_size=0.17647, random_state=42)

    return X_train, X_val, X_test, y_train, y_val, y_test


def _preprocess(df: pd.DataFrame, target_col: str | None):
    # Backward compatibility
    df = df.copy().dropna(axis=1, how="all")
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

def _run_classification_model(name: str, model, X_train, X_val, X_test, y_train, y_val, y_test):
    t0 = time.time()
    pipe = Pipeline([("scaler", StandardScaler()), ("clf", model)])
    pipe.fit(X_train, y_train)
    elapsed = round(time.time() - t0, 3)

    # 1. K-Fold Cross Validation on Train set
    try:
        cv_scores = cross_val_score(pipe, X_train, y_train, cv=5, scoring='f1_weighted')
        cv_mean = round(float(np.mean(cv_scores)), 4)
        cv_std = round(float(np.std(cv_scores)), 4)
    except Exception:
        cv_mean = 0.0
        cv_std = 0.0

    # 2. Validation Set Evaluation
    y_val_pred = pipe.predict(X_val)
    val_acc = round(accuracy_score(y_val, y_val_pred), 4)
    val_f1 = round(f1_score(y_val, y_val_pred, average="weighted", zero_division=0), 4)

    # 3. Test Set Evaluation
    y_test_pred = pipe.predict(X_test)
    test_acc = round(accuracy_score(y_test, y_test_pred), 4)
    test_f1 = round(f1_score(y_test, y_test_pred, average="weighted", zero_division=0), 4)
    test_precision = round(precision_score(y_test, y_test_pred, average="weighted", zero_division=0), 4)
    test_recall = round(recall_score(y_test, y_test_pred, average="weighted", zero_division=0), 4)

    # AUC-ROC on Test Set
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

    cm = confusion_matrix(y_test, y_test_pred).tolist()

    result = {
        "name": name,
        "cv_mean": cv_mean,
        "cv_std": cv_std,
        "val_accuracy": val_acc,
        "val_f1": val_f1,
        "accuracy": test_acc,
        "f1": test_f1,
        "precision": test_precision,
        "recall": test_recall,
        "auc_roc": auc,
        "training_time_s": elapsed,
        "confusion_matrix": cm,
    }

    # Feature importances if available
    clf = pipe.named_steps["clf"]
    if hasattr(clf, "feature_importances_"):
        fi = dict(zip(X_train.columns.tolist(), clf.feature_importances_.round(4).tolist()))
        result["feature_importances"] = dict(sorted(fi.items(), key=lambda x: x[1], reverse=True)[:15])
    elif hasattr(clf, "coef_"):
        coef = np.abs(clf.coef_[0]) if clf.coef_.ndim > 1 else np.abs(clf.coef_)
        fi = dict(zip(X_train.columns.tolist(), coef.round(4).tolist()))
        result["feature_importances"] = dict(sorted(fi.items(), key=lambda x: x[1], reverse=True)[:15])

    return result, pipe


def run_classification(df: pd.DataFrame, target_col: str, analysis_id: str):
    X, y, prep_logs, feat_logs = pipeline_preprocess_and_engineer(df, target_col, "classification")
    X_train, X_val, X_test, y_train, y_val, y_test = pipeline_train_val_test_split(X, y)

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
            executor.submit(_run_classification_model, name, model, X_train, X_val, X_test, y_train, y_val, y_test): name
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

    _save_winner(models[winner_name], X_train, y_train, X, analysis_id)

    return {
        "problem_type": "classification",
        "models": results,
        "winner": winner_name,
        "target_col": target_col,
        "feature_names": X.columns.tolist(),
        "classes": sorted(y.unique().tolist()) if hasattr(y, "unique") else [0, 1],
        "preprocessing_logs": prep_logs,
        "feature_engineering_logs": feat_logs,
        "split_info": {
            "train_size": len(X_train),
            "val_size": len(X_val),
            "test_size": len(X_test),
        }
    }


# ---------------------------------------------------------------------------
# Regression
# ---------------------------------------------------------------------------

def _run_regression_model(name: str, model, X_train, X_val, X_test, y_train, y_val, y_test):
    t0 = time.time()
    pipe = Pipeline([("scaler", StandardScaler()), ("reg", model)])
    pipe.fit(X_train, y_train)
    elapsed = round(time.time() - t0, 3)

    # 1. K-Fold CV on Train set
    try:
        cv_scores = cross_val_score(pipe, X_train, y_train, cv=5, scoring='r2')
        cv_mean = round(float(np.mean(cv_scores)), 4)
        cv_std = round(float(np.std(cv_scores)), 4)
    except Exception:
        cv_mean = 0.0
        cv_std = 0.0

    # 2. Validation Set
    y_val_pred = pipe.predict(X_val)
    val_r2 = round(float(r2_score(y_val, y_val_pred)), 4)
    val_rmse = round(float(np.sqrt(mean_squared_error(y_val, y_val_pred))), 4)

    # 3. Test Set
    y_test_pred = pipe.predict(X_test)
    test_r2 = round(float(r2_score(y_test, y_test_pred)), 4)
    test_rmse = round(float(np.sqrt(mean_squared_error(y_test, y_test_pred))), 4)
    test_mae = round(float(mean_absolute_error(y_test, y_test_pred)), 4)

    result = {
        "name": name,
        "cv_mean": cv_mean,
        "cv_std": cv_std,
        "val_r2": val_r2,
        "val_rmse": val_rmse,
        "r2": test_r2,
        "rmse": test_rmse,
        "mae": test_mae,
        "training_time_s": elapsed,
        "y_test": y_test.tolist()[:200],
        "y_pred": y_test_pred.tolist()[:200],
    }

    reg = pipe.named_steps["reg"]
    if hasattr(reg, "feature_importances_"):
        fi = dict(zip(X_train.columns.tolist(), reg.feature_importances_.round(4).tolist()))
        result["feature_importances"] = dict(sorted(fi.items(), key=lambda x: x[1], reverse=True)[:15])
    elif hasattr(reg, "coef_"):
        coef = np.abs(reg.coef_)
        fi = dict(zip(X_train.columns.tolist(), coef.round(4).tolist()))
        result["feature_importances"] = dict(sorted(fi.items(), key=lambda x: x[1], reverse=True)[:15])

    return result, pipe


def run_regression(df: pd.DataFrame, target_col: str, analysis_id: str):
    X, y, prep_logs, feat_logs = pipeline_preprocess_and_engineer(df, target_col, "regression")
    X_train, X_val, X_test, y_train, y_val, y_test = pipeline_train_val_test_split(X, y)

    models = {
        "Linear Regression": LinearRegression(),
        "Ridge": Ridge(alpha=1.0),
        "Lasso": Lasso(alpha=0.1, max_iter=2000),
        "XGBoost": xgb.XGBRegressor(n_estimators=100, random_state=42, verbosity=0),
    }

    results = []
    winner_pipe = None
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {
            executor.submit(_run_regression_model, name, model, X_train, X_val, X_test, y_train, y_val, y_test): name
            for name, model in models.items()
        }
        for future in as_completed(futures):
            try:
                res, pipe = future.result()
                results.append(res)
                if winner_pipe is None or res["r2"] > max(r["r2"] for r in results[:-1] or [{"r2": -9999}]):
                    winner_pipe = (pipe, res["name"])
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
        "preprocessing_logs": prep_logs,
        "feature_engineering_logs": feat_logs,
        "split_info": {
            "train_size": len(X_train),
            "val_size": len(X_val),
            "test_size": len(X_test),
        }
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
    X, _, prep_logs, feat_logs = pipeline_preprocess_and_engineer(df, None, "clustering")
    X_scaled = X.values

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
        "preprocessing_logs": prep_logs,
        "feature_engineering_logs": feat_logs,
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


# ---------------------------------------------------------------------------
# Streaming variant — yields individual model results as they complete
# ---------------------------------------------------------------------------

def run_all_stream(df: pd.DataFrame, problem_type: str, target_col: str | None, analysis_id: str):
    """
    Generator that yields individual model result dicts as they complete,
    then a final 'summary' event.  Used by the SSE /models/run-stream endpoint.
    """
    import json
    pt = problem_type.lower()

    # Pre-processing step
    try:
        if pt in ("classification", "regression"):
            X, y, prep_logs, feat_logs = pipeline_preprocess_and_engineer(df, target_col, pt)
            X_train, X_val, X_test, y_train, y_val, y_test = pipeline_train_val_test_split(X, y)
        else:
            prep_logs, feat_logs = [], []
    except Exception as e:
        yield {"event": "error", "data": json.dumps({"message": str(e)})}
        return

    yield {"event": "preprocessing_done", "data": json.dumps({
        "preprocessing_logs": prep_logs,
        "feature_engineering_logs": feat_logs,
    })}

    all_results = []
    winner_name = None

    if pt == "classification":
        models_dict = {
            "Logistic Regression": LogisticRegression(max_iter=500, random_state=42),
            "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42),
            "SVM": SVC(probability=True, random_state=42),
            "Gradient Boosting": GradientBoostingClassifier(n_estimators=100, random_state=42),
            "XGBoost": xgb.XGBClassifier(n_estimators=100, use_label_encoder=False,
                                          eval_metric="logloss", random_state=42, verbosity=0),
        }
        total = len(models_dict)
        done = 0
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = {
                executor.submit(_run_classification_model, name, model,
                                X_train, X_val, X_test, y_train, y_val, y_test): name
                for name, model in models_dict.items()
            }
            for future in as_completed(futures):
                name = futures[future]
                done += 1
                try:
                    res, _ = future.result()
                    all_results.append(res)
                    yield {"event": "model_done", "data": json.dumps({
                        "model": res,
                        "progress": done,
                        "total": total,
                    })}
                except Exception as e:
                    logger.error("Stream model failed: %s — %s", name, e)
                    yield {"event": "model_error", "data": json.dumps({
                        "name": name, "error": str(e), "progress": done, "total": total,
                    })}

        if all_results:
            all_results.sort(key=lambda r: r["f1"], reverse=True)
            winner_name = all_results[0]["name"]
            try:
                _save_winner(models_dict[winner_name], X_train, y_train, X, analysis_id)
                # Save encoders
                _save_encoders(df, target_col, pt, analysis_id)
            except Exception as e:
                logger.warning("Could not save winner model: %s", e)

        final = {
            "problem_type": "classification",
            "models": all_results,
            "winner": winner_name,
            "target_col": target_col,
            "feature_names": X.columns.tolist() if all_results else [],
            "classes": sorted(y.unique().tolist()) if hasattr(y, "unique") else [],
            "preprocessing_logs": prep_logs,
            "feature_engineering_logs": feat_logs,
            "split_info": {
                "train_size": len(X_train),
                "val_size": len(X_val),
                "test_size": len(X_test),
            }
        }

    elif pt == "regression":
        models_dict = {
            "Linear Regression": LinearRegression(),
            "Ridge": Ridge(alpha=1.0, random_state=42),
            "Lasso": Lasso(alpha=0.01, random_state=42),
            "XGBoost": xgb.XGBRegressor(n_estimators=100, random_state=42, verbosity=0),
        }
        total = len(models_dict)
        done = 0
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = {
                executor.submit(_run_regression_model, name, model,
                                X_train, X_val, X_test, y_train, y_val, y_test): name
                for name, model in models_dict.items()
            }
            for future in as_completed(futures):
                name = futures[future]
                done += 1
                try:
                    res, _ = future.result()
                    all_results.append(res)
                    yield {"event": "model_done", "data": json.dumps({
                        "model": res, "progress": done, "total": total,
                    })}
                except Exception as e:
                    yield {"event": "model_error", "data": json.dumps({
                        "name": name, "error": str(e), "progress": done, "total": total,
                    })}

        if all_results:
            all_results.sort(key=lambda r: r.get("r2", 0), reverse=True)
            winner_name = all_results[0]["name"]
            try:
                _save_winner(models_dict[winner_name], X_train, y_train, X, analysis_id)
                _save_encoders(df, target_col, pt, analysis_id)
            except Exception as e:
                logger.warning("Could not save winner: %s", e)

        final = {
            "problem_type": "regression",
            "models": all_results,
            "winner": winner_name,
            "target_col": target_col,
            "feature_names": X.columns.tolist() if all_results else [],
            "preprocessing_logs": prep_logs,
            "feature_engineering_logs": feat_logs,
            "split_info": {
                "train_size": len(X_train),
                "val_size": len(X_val),
                "test_size": len(X_test),
            }
        }

    else:
        # For clustering/timeseries — fall back to run_all (no streaming support yet)
        try:
            final = run_all(df, problem_type, target_col, analysis_id)
            yield {"event": "model_done", "data": json.dumps({
                "model": final.get("models", [{}])[0] if final.get("models") else {},
                "progress": 1, "total": 1,
            })}
        except Exception as e:
            yield {"event": "error", "data": json.dumps({"message": str(e)})}
            return

    yield {"event": "done", "data": json.dumps(final)}


def _save_encoders(df: pd.DataFrame, target_col: str | None, problem_type: str, analysis_id: str):
    """
    Saves a dict of fitted LabelEncoders for categorical feature columns so
    What-If prediction can properly transform categorical inputs.
    """
    encoders: dict = {}
    for col in df.columns:
        if col == target_col:
            continue
        if not pd.api.types.is_numeric_dtype(df[col]):
            le = LabelEncoder()
            le.fit(df[col].astype(str))
            encoders[col] = le
    path = os.path.join(UPLOAD_DIR, f"{analysis_id}_encoders.pkl")
    joblib.dump(encoders, path)
    logger.info("Saved %d encoders for analysis %s", len(encoders), analysis_id)
