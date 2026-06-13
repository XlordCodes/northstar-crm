# app/schemas/analytics.py
"""
Analytics and Dashboard Pydantic Schemas
"""

from pydantic import BaseModel, ConfigDict


class DashboardKPIs(BaseModel):
    """
    Dashboard key performance indicators for a specific tenant workspace.
    All values are scoped strictly to the authenticated user's tenant.
    """
    total_contacts: int
    total_users: int
    total_deals: int
    active_deals: int
    total_revenue_cents: int
    
    model_config = ConfigDict(from_attributes=True)
