# app/models/tenant.py
"""
Module: Tenant (Workspace) Model
Context: Pod A - Identity & Multi-Tenancy

Defines the Tenant entity representing a SaaS workspace.
Each registration provisions a new Tenant and binds the first user as admin.
"""

from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base


class Tenant(Base):
    """
    Represents a SaaS workspace (organization/company).
    All data is scoped to a tenant via the tenant_id foreign key on other models.
    """
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
