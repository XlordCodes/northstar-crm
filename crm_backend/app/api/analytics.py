# app/api/analytics.py
"""
Module: Analytics & BI API
Context: Pod C - Module 7 (Reporting).

Exposes read-only endpoints for high-level business metrics.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.reports.service_report import ReportService
from app.models import User, Contact, Deal
from app.authentication.router import get_current_user
from app.schemas.analytics import DashboardKPIs

router = APIRouter()


@router.get("/dashboard/kpis", response_model=DashboardKPIs)
def get_dashboard_kpis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get tenant-scoped dashboard KPIs for the authenticated user's workspace.
    All metrics are strictly isolated by tenant_id to prevent cross-workspace data leaks.
    """
    tenant_id = current_user.tenant_id
    
    total_contacts = db.query(func.count(Contact.id))\
        .filter(Contact.tenant_id == tenant_id)\
        .scalar() or 0
    
    total_users = db.query(func.count(User.id))\
        .filter(User.tenant_id == tenant_id)\
        .scalar() or 0
    
    total_deals = db.query(func.count(Deal.id))\
        .filter(Deal.tenant_id == tenant_id)\
        .scalar() or 0
    
    # Deal status column not implemented yet - return safe defaults
    active_deals = total_deals
    total_revenue_cents = db.query(func.sum(Deal.value_cents))\
        .filter(Deal.tenant_id == tenant_id)\
        .scalar() or 0
    
    return DashboardKPIs(
        total_contacts=total_contacts,
        total_users=total_users,
        total_deals=total_deals,
        active_deals=active_deals,
        total_revenue_cents=total_revenue_cents
    )


@router.get("/kpis")
def get_kpis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get high-level delivery KPIs (Sent/Delivered/Read/Failed counts).
    """
    return ReportService(db).get_kpi_counts()

@router.get("/sentiment")
def get_sentiment(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the distribution of sentiment across all messages.
    Useful for pie charts.
    """
    return ReportService(db).get_sentiment_mix()

@router.get("/avg-response")
def get_response_time(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get average response time metrics per conversation.
    """
    return ReportService(db).get_avg_response_time()