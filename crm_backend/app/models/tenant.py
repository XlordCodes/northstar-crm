# app/models/tenant.py
"""
Module: Tenant (Workspace) Model
Context: Pod A - Identity & Multi-Tenancy

Defines the Tenant entity representing a SaaS workspace.
Each registration provisions a new Tenant and binds the first user as admin.

BYON (Bring Your Own Number): credential fields allow each tenant to supply
their own Resend and WhatsApp Cloud API keys so all outbound traffic originates
from that tenant's own registered phone number / sender domain.
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

    # -------------------------------------------------------------------------
    # BYON: Email (Resend)
    # Stored nullable — if absent, the system falls back to the global key.
    # -------------------------------------------------------------------------
    resend_api_key = Column(String, nullable=True)

    # -------------------------------------------------------------------------
    # BYON: WhatsApp (Meta Cloud API)
    # wa_phone_number_id is indexed: it is the lookup key used by the inbound
    # webhook handler to resolve which tenant owns an incoming message.
    # -------------------------------------------------------------------------
    wa_access_token = Column(String, nullable=True)
    wa_phone_number_id = Column(String, nullable=True, index=True)
    wa_business_account_id = Column(String, nullable=True)

    # ORM back-reference populated by EmailTemplate.tenant relationship.
    email_templates = relationship(
        "EmailTemplate",
        back_populates="tenant",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )
