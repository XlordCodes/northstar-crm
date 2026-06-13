# app/models/email_template.py
"""
Module: Email Template Model
Context: Pod C - BYON Communications

Stores per-tenant HTML email templates that are rendered and dispatched
by the BYON email service using each tenant's own Resend API key.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class EmailTemplate(Base):
    """
    A reusable HTML email template owned by a single tenant.

    Templates are referenced by name when dispatching transactional or
    campaign emails, and are rendered via Jinja2 with per-call context data.
    """
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, index=True)

    # Security boundary: every template is strictly scoped to one tenant.
    tenant_id = Column(
        Integer,
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Human-readable identifier used as the lookup key in service calls.
    name = Column(String, nullable=False, index=True)

    # Email header fields stored alongside the body for self-contained records.
    subject = Column(String, nullable=False)
    body_html = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship back to Tenant (lazy-loaded, read-only from this side).
    tenant = relationship("Tenant", back_populates="email_templates")
