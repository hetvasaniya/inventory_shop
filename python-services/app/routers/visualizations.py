"""
H-Mart Visualization Router
Generates interactive charts and graphs for the sales dashboard.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import plotly.express as px
import plotly.graph_objects as go
import plotly.io as pio
import json

router = APIRouter()


class SalesDataItem(BaseModel):
    date: str
    revenue: float
    bills: int
    cash: float = 0
    upi: float = 0


class ProductSalesItem(BaseModel):
    name: str
    quantity: int
    revenue: float


class SalesRequest(BaseModel):
    data: List[SalesDataItem]
    chart_type: str = "bar"  # bar, line, area
    title: str = "Sales Overview"
    period: str = "daily"  # daily, weekly, monthly


class ProductSalesRequest(BaseModel):
    data: List[ProductSalesItem]
    top_n: int = 10
    title: str = "Top Selling Products"


class StockItem(BaseModel):
    name: str
    stock: int
    minStockLevel: int
    category: str = ""


class StockRequest(BaseModel):
    data: List[StockItem]
    title: str = "Stock Levels"


class CategorySalesItem(BaseModel):
    category: str
    revenue: float
    quantity: int


class CategoryRequest(BaseModel):
    data: List[CategorySalesItem]
    title: str = "Sales by Category"


@router.post("/sales-trend")
async def sales_trend_chart(request: SalesRequest):
    """Generate a sales trend chart (line/bar/area)."""
    if not request.data:
        raise HTTPException(status_code=400, detail="No data provided")

    dates = [item.date for item in request.data]
    revenues = [item.revenue for item in request.data]
    bills = [item.bills for item in request.data]

    fig = go.Figure()

    if request.chart_type == "line":
        fig.add_trace(go.Scatter(
            x=dates, y=revenues,
            mode='lines+markers',
            name='Revenue (₹)',
            line=dict(color='#1976D2', width=3),
            marker=dict(size=8)
        ))
    elif request.chart_type == "area":
        fig.add_trace(go.Scatter(
            x=dates, y=revenues,
            fill='tozeroy',
            name='Revenue (₹)',
            line=dict(color='#1976D2'),
            fillcolor='rgba(25, 118, 210, 0.2)'
        ))
    else:
        fig.add_trace(go.Bar(
            x=dates, y=revenues,
            name='Revenue (₹)',
            marker_color='#1976D2',
            opacity=0.85
        ))

    # Add bill count on secondary axis
    fig.add_trace(go.Scatter(
        x=dates, y=bills,
        mode='lines+markers',
        name='Bills',
        yaxis='y2',
        line=dict(color='#00BCD4', width=2, dash='dot'),
        marker=dict(size=6)
    ))

    fig.update_layout(
        title=dict(text=request.title, font=dict(size=20, color='#E0E0E0')),
        xaxis_title=request.period.capitalize(),
        yaxis_title='Revenue (₹)',
        yaxis2=dict(title='Number of Bills', overlaying='y', side='right', showgrid=False),
        template='plotly_dark',
        plot_bgcolor='rgba(10, 25, 41, 0.8)',
        paper_bgcolor='rgba(10, 25, 41, 0)',
        font=dict(family='Inter', color='#B0BEC5'),
        legend=dict(orientation='h', yanchor='bottom', y=1.02, xanchor='right', x=1),
        margin=dict(l=60, r=60, t=80, b=60),
        hovermode='x unified'
    )

    return {"chart_json": json.loads(pio.to_json(fig))}


@router.post("/payment-split")
async def payment_split_chart(request: SalesRequest):
    """Generate a pie chart showing cash vs other payment split."""
    total_cash = sum(item.cash for item in request.data)
    total_upi = sum(item.upi for item in request.data)

    fig = go.Figure(data=[go.Pie(
        labels=['Cash', 'UPI/Other'],
        values=[total_cash, total_upi],
        hole=0.5,
        marker=dict(colors=['#4CAF50', '#1976D2']),
        textinfo='label+percent',
        textfont=dict(size=14, color='white')
    )])

    fig.update_layout(
        title=dict(text='Payment Method Split', font=dict(size=18, color='#E0E0E0')),
        template='plotly_dark',
        plot_bgcolor='rgba(10, 25, 41, 0.8)',
        paper_bgcolor='rgba(10, 25, 41, 0)',
        font=dict(family='Inter', color='#B0BEC5'),
        showlegend=True,
        legend=dict(orientation='h', yanchor='bottom', y=-0.1, xanchor='center', x=0.5),
        annotations=[dict(
            text=f'₹{total_cash + total_upi:,.0f}',
            x=0.5, y=0.5, font_size=20, showarrow=False, font_color='#E0E0E0'
        )]
    )

    return {"chart_json": json.loads(pio.to_json(fig))}


@router.post("/top-products")
async def top_products_chart(request: ProductSalesRequest):
    """Generate a horizontal bar chart of top selling products."""
    if not request.data:
        raise HTTPException(status_code=400, detail="No data provided")

    sorted_data = sorted(request.data, key=lambda x: x.revenue, reverse=True)[:request.top_n]
    sorted_data.reverse()

    names = [item.name for item in sorted_data]
    revenues = [item.revenue for item in sorted_data]
    quantities = [item.quantity for item in sorted_data]

    fig = go.Figure()

    fig.add_trace(go.Bar(
        y=names, x=revenues,
        orientation='h',
        name='Revenue (₹)',
        marker=dict(
            color=revenues,
            colorscale=[[0, '#1976D2'], [0.5, '#00BCD4'], [1, '#4CAF50']],
            opacity=0.85
        ),
        text=[f'₹{r:,.0f} ({q} sold)' for r, q in zip(revenues, quantities)],
        textposition='auto',
        textfont=dict(color='white', size=11)
    ))

    fig.update_layout(
        title=dict(text=request.title, font=dict(size=20, color='#E0E0E0')),
        xaxis_title='Revenue (₹)',
        template='plotly_dark',
        plot_bgcolor='rgba(10, 25, 41, 0.8)',
        paper_bgcolor='rgba(10, 25, 41, 0)',
        font=dict(family='Inter', color='#B0BEC5'),
        margin=dict(l=150, r=40, t=80, b=60),
        height=max(400, len(names) * 45 + 150)
    )

    return {"chart_json": json.loads(pio.to_json(fig))}


@router.post("/stock-levels")
async def stock_levels_chart(request: StockRequest):
    """Generate a stock levels chart with color coding."""
    if not request.data:
        raise HTTPException(status_code=400, detail="No data provided")

    names = [item.name for item in request.data]
    stocks = [item.stock for item in request.data]
    min_levels = [item.minStockLevel for item in request.data]

    colors = []
    for item in request.data:
        ratio = item.stock / max(item.minStockLevel, 1)
        if ratio <= 0.5:
            colors.append('#F44336')  # Red - critical
        elif ratio <= 1.5:
            colors.append('#FF9800')  # Amber - warning
        else:
            colors.append('#4CAF50')  # Green - healthy

    fig = go.Figure()

    fig.add_trace(go.Bar(
        x=names, y=stocks,
        name='Current Stock',
        marker_color=colors,
        opacity=0.85,
        text=stocks,
        textposition='outside',
        textfont=dict(color='#E0E0E0', size=11)
    ))

    fig.add_trace(go.Scatter(
        x=names, y=min_levels,
        mode='lines+markers',
        name='Min Stock Level',
        line=dict(color='#FF5722', width=2, dash='dash'),
        marker=dict(size=8, symbol='diamond')
    ))

    fig.update_layout(
        title=dict(text=request.title, font=dict(size=20, color='#E0E0E0')),
        xaxis_title='Product',
        yaxis_title='Quantity',
        template='plotly_dark',
        plot_bgcolor='rgba(10, 25, 41, 0.8)',
        paper_bgcolor='rgba(10, 25, 41, 0)',
        font=dict(family='Inter', color='#B0BEC5'),
        legend=dict(orientation='h', yanchor='bottom', y=1.02, xanchor='right', x=1),
        margin=dict(l=60, r=40, t=80, b=100),
        xaxis_tickangle=-45,
        barmode='group'
    )

    return {"chart_json": json.loads(pio.to_json(fig))}


@router.post("/category-breakdown")
async def category_breakdown_chart(request: CategoryRequest):
    """Generate a category-wise sales breakdown (treemap)."""
    if not request.data:
        raise HTTPException(status_code=400, detail="No data provided")

    categories = [item.category for item in request.data]
    revenues = [item.revenue for item in request.data]
    quantities = [item.quantity for item in request.data]

    fig = go.Figure(data=[go.Treemap(
        labels=categories,
        values=revenues,
        parents=["" for _ in categories],
        texttemplate="<b>%{label}</b><br>₹%{value:,.0f}",
        marker=dict(
            colorscale=[[0, '#0A1929'], [0.3, '#1976D2'], [0.6, '#00BCD4'], [1, '#4CAF50']],
            line=dict(width=2, color='#0A1929')
        ),
        hovertemplate='<b>%{label}</b><br>Revenue: ₹%{value:,.0f}<extra></extra>'
    )])

    fig.update_layout(
        title=dict(text=request.title, font=dict(size=20, color='#E0E0E0')),
        template='plotly_dark',
        paper_bgcolor='rgba(10, 25, 41, 0)',
        font=dict(family='Inter', color='#B0BEC5'),
        margin=dict(l=20, r=20, t=80, b=20)
    )

    return {"chart_json": json.loads(pio.to_json(fig))}
