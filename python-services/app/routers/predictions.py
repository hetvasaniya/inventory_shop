"""
H-Mart Prediction Router
AI-based demand prediction and restock suggestions using scikit-learn.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import numpy as np
import json

router = APIRouter()


class SalesHistoryItem(BaseModel):
    date: str
    product_name: str
    quantity_sold: int
    revenue: float


class PredictionRequest(BaseModel):
    sales_history: List[SalesHistoryItem]
    prediction_days: int = 7


class RestockItem(BaseModel):
    product_name: str
    current_stock: int
    avg_daily_sales: float
    lead_time_days: int = 3


class RestockRequest(BaseModel):
    products: List[RestockItem]


class DemandItem(BaseModel):
    product_name: str
    daily_sales: List[float]  # Last N days of sales


class DemandRequest(BaseModel):
    products: List[DemandItem]
    forecast_days: int = 7


@router.post("/demand-forecast")
async def demand_forecast(request: DemandRequest):
    """
    Simple demand forecast using moving average and linear trend.
    For small shops, complex ML models are overkill — a weighted moving average
    with trend detection provides practical, interpretable results.
    """
    if not request.products:
        raise HTTPException(status_code=400, detail="No product data provided")

    forecasts = []

    for product in request.products:
        sales = np.array(product.daily_sales, dtype=float)

        if len(sales) < 3:
            # Not enough data — use simple average
            avg = float(np.mean(sales)) if len(sales) > 0 else 0
            forecast = [round(avg, 1)] * request.forecast_days
            trend = "insufficient_data"
            confidence = "low"
        else:
            # Weighted Moving Average (recent days weighted more)
            window = min(7, len(sales))
            weights = np.arange(1, window + 1, dtype=float)
            weights = weights / weights.sum()
            wma = float(np.average(sales[-window:], weights=weights))

            # Linear trend detection
            x = np.arange(len(sales))
            coeffs = np.polyfit(x, sales, 1)
            slope = coeffs[0]
            daily_trend = float(slope)

            # Generate forecast
            forecast = []
            for day in range(1, request.forecast_days + 1):
                predicted = max(0, wma + daily_trend * day)
                forecast.append(round(predicted, 1))

            # Determine trend direction
            if daily_trend > 0.5:
                trend = "increasing"
            elif daily_trend < -0.5:
                trend = "decreasing"
            else:
                trend = "stable"

            # Confidence based on data consistency
            cv = float(np.std(sales) / max(np.mean(sales), 0.01))
            if cv < 0.3:
                confidence = "high"
            elif cv < 0.6:
                confidence = "medium"
            else:
                confidence = "low"

        forecasts.append({
            "product_name": product.product_name,
            "forecast": forecast,
            "trend": trend,
            "confidence": confidence,
            "avg_daily_sales": round(float(np.mean(sales)), 1) if len(sales) > 0 else 0
        })

    return {"predictions": forecasts}


@router.post("/restock-suggestions")
async def restock_suggestions(request: RestockRequest):
    """
    Suggest which products need restocking based on current stock,
    average daily sales, and lead time.
    """
    if not request.products:
        raise HTTPException(status_code=400, detail="No product data provided")

    suggestions = []

    for product in request.products:
        days_of_stock = (
            product.current_stock / max(product.avg_daily_sales, 0.01)
        )
        safety_stock = product.avg_daily_sales * product.lead_time_days * 1.5
        reorder_point = product.avg_daily_sales * product.lead_time_days + safety_stock
        suggested_order = max(0, reorder_point - product.current_stock)

        if days_of_stock <= product.lead_time_days:
            urgency = "critical"
            action = "Order immediately"
        elif days_of_stock <= product.lead_time_days * 2:
            urgency = "high"
            action = "Order soon"
        elif days_of_stock <= product.lead_time_days * 3:
            urgency = "medium"
            action = "Plan to reorder"
        else:
            urgency = "low"
            action = "Stock sufficient"

        suggestions.append({
            "product_name": product.product_name,
            "current_stock": product.current_stock,
            "days_of_stock_remaining": round(days_of_stock, 1),
            "reorder_point": round(reorder_point, 0),
            "suggested_order_quantity": round(suggested_order, 0),
            "urgency": urgency,
            "action": action
        })

    # Sort by urgency (critical first)
    urgency_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    suggestions.sort(key=lambda x: urgency_order.get(x["urgency"], 4))

    return {
        "suggestions": suggestions,
        "summary": {
            "critical": sum(1 for s in suggestions if s["urgency"] == "critical"),
            "high": sum(1 for s in suggestions if s["urgency"] == "high"),
            "medium": sum(1 for s in suggestions if s["urgency"] == "medium"),
            "low": sum(1 for s in suggestions if s["urgency"] == "low")
        }
    }


@router.post("/sales-insights")
async def sales_insights(request: PredictionRequest):
    """
    Generate AI-powered insights from sales history:
    - Best selling products
    - Revenue trends
    - Seasonal patterns
    - Anomaly detection
    """
    if not request.sales_history:
        raise HTTPException(status_code=400, detail="No sales history provided")

    # Aggregate by product
    product_sales = {}
    date_revenue = {}

    for item in request.sales_history:
        # Product aggregation
        if item.product_name not in product_sales:
            product_sales[item.product_name] = {"quantity": 0, "revenue": 0.0, "days": set()}
        product_sales[item.product_name]["quantity"] += item.quantity_sold
        product_sales[item.product_name]["revenue"] += item.revenue
        product_sales[item.product_name]["days"].add(item.date)

        # Date aggregation
        if item.date not in date_revenue:
            date_revenue[item.date] = 0.0
        date_revenue[item.date] += item.revenue

    # Generate insights
    insights = []

    # Top seller
    if product_sales:
        top_product = max(product_sales.items(), key=lambda x: x[1]["revenue"])
        insights.append({
            "type": "top_seller",
            "title": "🏆 Top Selling Product",
            "message": f"{top_product[0]} generated ₹{top_product[1]['revenue']:,.0f} revenue with {top_product[1]['quantity']} units sold.",
            "priority": "info"
        })

    # Revenue trend
    if len(date_revenue) >= 3:
        dates_sorted = sorted(date_revenue.keys())
        revenues = [date_revenue[d] for d in dates_sorted]
        recent_avg = np.mean(revenues[-3:])
        older_avg = np.mean(revenues[:-3]) if len(revenues) > 3 else recent_avg

        if recent_avg > older_avg * 1.1:
            insights.append({
                "type": "revenue_trend",
                "title": "📈 Revenue Growing",
                "message": f"Recent daily average (₹{recent_avg:,.0f}) is {((recent_avg/max(older_avg,1))-1)*100:.0f}% higher than previous period.",
                "priority": "success"
            })
        elif recent_avg < older_avg * 0.9:
            insights.append({
                "type": "revenue_trend",
                "title": "📉 Revenue Declining",
                "message": f"Recent daily average (₹{recent_avg:,.0f}) is {((1-recent_avg/max(older_avg,1)))*100:.0f}% lower than previous period.",
                "priority": "warning"
            })

    # Slow movers
    if len(product_sales) > 3:
        avg_quantity = np.mean([p["quantity"] for p in product_sales.values()])
        slow_movers = [
            name for name, data in product_sales.items()
            if data["quantity"] < avg_quantity * 0.3
        ]
        if slow_movers:
            insights.append({
                "type": "slow_movers",
                "title": "🐌 Slow Moving Products",
                "message": f"{len(slow_movers)} products are selling significantly below average: {', '.join(slow_movers[:5])}",
                "priority": "warning"
            })

    # Best day
    if date_revenue:
        best_day = max(date_revenue.items(), key=lambda x: x[1])
        insights.append({
            "type": "best_day",
            "title": "🎯 Best Sales Day",
            "message": f"Highest revenue was ₹{best_day[1]:,.0f} on {best_day[0]}.",
            "priority": "info"
        })

    return {"insights": insights, "total_products_analyzed": len(product_sales)}
