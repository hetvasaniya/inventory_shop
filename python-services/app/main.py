"""
BizGrow Python Analytics Service
FastAPI microservice for data visualization, demand prediction, and report generation.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
except ImportError:
    pass

app = FastAPI(
    title="BizGrow Analytics Service",
    description="Data visualization, demand prediction, and report generation for BizGrow",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import visualizations, predictions, reports, ai_analytics

app.include_router(visualizations.router, prefix="/api/analytics", tags=["Visualizations"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["Predictions"])
app.include_router(reports.router, prefix="/api/reports/export", tags=["Reports"])
app.include_router(ai_analytics.router, prefix="/api/ai-ml", tags=["AI & Machine Learning"])


@app.get("/")
async def root():
    return {"service": "BizGrow Analytics", "status": "running", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
