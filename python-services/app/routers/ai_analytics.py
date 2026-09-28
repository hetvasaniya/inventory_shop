"""
BizGrow AI & Analytics Router (FastAPI Microservice)
Demonstrates Supervised Learning (Regression & Classification),
Unsupervised Learning (K-Means), and Apriori Association Mining using scikit-learn & pandas.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.cluster import KMeans
from sklearn.metrics import mean_absolute_error, r2_score, accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, silhouette_score
try:
    from sklearn.metrics import root_mean_squared_error
except ImportError:
    from sklearn.metrics import mean_squared_error
    def root_mean_squared_error(y_true, y_pred):
        return float(np.sqrt(mean_squared_error(y_true, y_pred)))

router = APIRouter()

class TrainDemandRequest(BaseModel):
    features: List[List[float]]
    targets: List[float]
    test_features: Optional[List[List[float]]] = None
    test_targets: Optional[List[float]] = None

@router.post("/demand-models/compare")
async def compare_demand_models(req: TrainDemandRequest):
    if len(req.features) < 5:
        raise HTTPException(status_code=400, detail="Insufficient feature samples for regression training")

    X = np.array(req.features)
    y = np.array(req.targets)

    split = int(0.8 * len(X))
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    if len(X_test) == 0:
        X_test, y_test = X_train, y_train

    # Linear Regression
    lr = LinearRegression()
    lr.fit(X_train, y_train)
    lr_pred = lr.predict(X_test)

    # Random Forest Regressor
    rf = RandomForestRegressor(n_estimators=20, random_state=42)
    rf.fit(X_train, y_train)
    rf_pred = rf.predict(X_test)

    return {
        "linear_regression": {
            "mae": round(float(mean_absolute_error(y_test, lr_pred)), 3),
            "rmse": round(float(root_mean_squared_error(y_test, lr_pred)), 3),
            "r2": round(float(r2_score(y_test, lr_pred)), 3),
        },
        "random_forest": {
            "mae": round(float(mean_absolute_error(y_test, rf_pred)), 3),
            "rmse": round(float(root_mean_squared_error(y_test, rf_pred)), 3),
            "r2": round(float(r2_score(y_test, rf_pred)), 3),
        }
    }

class TrainRiskRequest(BaseModel):
    features: List[List[float]]
    targets: List[int]

@router.post("/stock-risk/compare")
async def compare_stock_risk_models(req: TrainRiskRequest):
    if len(req.features) < 5:
        raise HTTPException(status_code=400, detail="Insufficient feature samples for classification")

    X = np.array(req.features)
    y = np.array(req.targets)

    split = int(0.75 * len(X))
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    if len(X_test) == 0:
        X_test, y_test = X_train, y_train

    lr = LogisticRegression(max_iter=300)
    lr.fit(X_train, y_train)
    lr_pred = lr.predict(X_test)

    rf = RandomForestClassifier(n_estimators=20, random_state=42)
    rf.fit(X_train, y_train)
    rf_pred = rf.predict(X_test)

    return {
        "logistic_regression": {
            "accuracy": round(float(accuracy_score(y_test, lr_pred)), 3),
            "f1": round(float(f1_score(y_test, lr_pred, average="macro", zero_division=0)), 3),
        },
        "random_forest": {
            "accuracy": round(float(accuracy_score(y_test, rf_pred)), 3),
            "f1": round(float(f1_score(y_test, rf_pred, average="macro", zero_division=0)), 3),
            "confusion_matrix": confusion_matrix(y_test, rf_pred).tolist(),
        }
    }

class ClusteringRequest(BaseModel):
    features: List[List[float]]
    k: int = 3

@router.post("/clustering/kmeans")
async def cluster_products(req: ClusteringRequest):
    if len(req.features) < req.k:
        raise HTTPException(status_code=400, detail="Number of samples must exceed K")

    X = np.array(req.features)
    km = KMeans(n_clusters=req.k, random_state=42, n_init="auto")
    labels = km.fit_predict(X)

    score = 0.0
    if len(X) > req.k:
        score = round(float(silhouette_score(X, labels)), 3)

    return {
        "k": req.k,
        "inertia": round(float(km.inertia_), 2),
        "silhouette_score": score,
        "cluster_centers": km.cluster_centers_.tolist(),
        "labels": labels.tolist()
    }
