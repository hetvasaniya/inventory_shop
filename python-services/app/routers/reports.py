"""
H-Mart Reports Router
PDF report generation and data export.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import io
import json

router = APIRouter()


class ReportSalesItem(BaseModel):
    date: str
    revenue: float
    bills: int
    cash: float = 0


class DailyReportRequest(BaseModel):
    shop_name: str
    gstin: str = ""
    date: str
    sales: List[ReportSalesItem]
    top_products: List[dict] = []
    total_revenue: float = 0
    total_bills: int = 0
    total_products_sold: int = 0


class StockReportItem(BaseModel):
    name: str
    sku: str
    stock: int
    minStockLevel: int
    category: str
    sellingPrice: float


class StockReportRequest(BaseModel):
    shop_name: str
    date: str
    products: List[StockReportItem]


@router.post("/sales-chart-image")
async def generate_sales_chart_image(request: DailyReportRequest):
    """Generate a sales chart as a PNG image for embedding in reports."""
    if not request.sales:
        raise HTTPException(status_code=400, detail="No sales data provided")

    # Style configuration
    plt.style.use('dark_background')
    fig, ax = plt.subplots(figsize=(12, 5))

    dates = [item.date for item in request.sales]
    revenues = [item.revenue for item in request.sales]

    # Gradient-like bar colors
    colors = ['#1976D2' if r >= max(revenues) * 0.7
              else '#42A5F5' if r >= max(revenues) * 0.4
              else '#90CAF9' for r in revenues]

    bars = ax.bar(dates, revenues, color=colors, alpha=0.85, edgecolor='#0A1929', linewidth=0.5)

    # Add value labels on bars
    for bar, rev in zip(bars, revenues):
        ax.text(bar.get_x() + bar.get_width() / 2., bar.get_height() + max(revenues) * 0.02,
                f'₹{rev:,.0f}', ha='center', va='bottom', fontsize=8, color='#E0E0E0')

    ax.set_xlabel('Date', fontsize=12, color='#B0BEC5')
    ax.set_ylabel('Revenue (₹)', fontsize=12, color='#B0BEC5')
    ax.set_title(f'{request.shop_name} - Sales Report', fontsize=16, color='#E0E0E0', pad=15)

    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, p: f'₹{x:,.0f}'))
    ax.tick_params(colors='#B0BEC5')
    ax.spines['bottom'].set_color('#37474F')
    ax.spines['left'].set_color('#37474F')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)

    plt.xticks(rotation=45, ha='right')
    fig.patch.set_facecolor('#0A1929')
    ax.set_facecolor('#0D2137')
    plt.tight_layout()

    # Save to buffer
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='#0A1929')
    buf.seek(0)
    plt.close(fig)

    return StreamingResponse(buf, media_type="image/png", headers={
        "Content-Disposition": f"inline; filename=sales-report-{request.date}.png"
    })


@router.post("/stock-chart-image")
async def generate_stock_chart_image(request: StockReportRequest):
    """Generate a stock levels chart as PNG for reports."""
    if not request.products:
        raise HTTPException(status_code=400, detail="No product data provided")

    plt.style.use('dark_background')
    fig, ax = plt.subplots(figsize=(12, max(6, len(request.products) * 0.4)))

    products = request.products[:30]  # Limit to 30 for readability
    names = [p.name for p in products]
    stocks = [p.stock for p in products]
    min_levels = [p.minStockLevel for p in products]

    colors = []
    for p in products:
        ratio = p.stock / max(p.minStockLevel, 1)
        if ratio <= 0.5:
            colors.append('#F44336')
        elif ratio <= 1.5:
            colors.append('#FF9800')
        else:
            colors.append('#4CAF50')

    y_pos = range(len(names))
    bars = ax.barh(y_pos, stocks, color=colors, alpha=0.85, height=0.6)

    # Min stock level line
    for i, min_lvl in enumerate(min_levels):
        ax.plot(min_lvl, i, 'D', color='#FF5722', markersize=8)

    ax.set_yticks(y_pos)
    ax.set_yticklabels(names, fontsize=9)
    ax.set_xlabel('Stock Quantity', fontsize=12, color='#B0BEC5')
    ax.set_title(f'{request.shop_name} - Stock Report ({request.date})',
                 fontsize=16, color='#E0E0E0', pad=15)

    ax.tick_params(colors='#B0BEC5')
    ax.spines['bottom'].set_color('#37474F')
    ax.spines['left'].set_color('#37474F')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)

    fig.patch.set_facecolor('#0A1929')
    ax.set_facecolor('#0D2137')
    plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='#0A1929')
    buf.seek(0)
    plt.close(fig)

    return StreamingResponse(buf, media_type="image/png", headers={
        "Content-Disposition": f"inline; filename=stock-report-{request.date}.png"
    })


@router.post("/summary")
async def generate_report_summary(request: DailyReportRequest):
    """Generate a text-based report summary with key metrics."""
    total_revenue = sum(item.revenue for item in request.sales)
    total_bills = sum(item.bills for item in request.sales)
    total_cash = sum(item.cash for item in request.sales)
    avg_bill_value = total_revenue / max(total_bills, 1)

    best_day = max(request.sales, key=lambda x: x.revenue) if request.sales else None
    worst_day = min(request.sales, key=lambda x: x.revenue) if request.sales else None

    return {
        "summary": {
            "shop_name": request.shop_name,
            "period": request.date,
            "total_revenue": round(total_revenue, 2),
            "total_bills": total_bills,
            "average_bill_value": round(avg_bill_value, 2),
            "total_cash": round(total_cash, 2),
            "best_day": {
                "date": best_day.date if best_day else None,
                "revenue": best_day.revenue if best_day else 0
            },
            "worst_day": {
                "date": worst_day.date if worst_day else None,
                "revenue": worst_day.revenue if worst_day else 0
            }
        }
    }
