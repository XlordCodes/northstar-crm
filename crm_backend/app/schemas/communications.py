# app/schemas/communications.py
"""
Module: Communications Schemas
Context: Pod C - BYON Communications

Pydantic models for the BYON communications layer, starting with
EmailTemplate CRUD contracts.  WhatsApp-specific request/response models
will be added here in later phases.
"""

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


# ---------------------------------------------------------------------------
# Email Template Schemas
# ---------------------------------------------------------------------------

class TemplateBase(BaseModel):
    """Shared properties for EmailTemplate creation and read."""
    name: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Unique (per-tenant) template identifier, e.g. 'welcome_email'",
    )
    subject: str = Field(..., min_length=1, description="Email subject line")
    body_html: str = Field(..., min_length=1, description="Jinja2-compatible HTML body")


class TemplateCreate(TemplateBase):
    """Payload for creating a new EmailTemplate."""
    pass


class TemplateUpdate(BaseModel):
    """Partial-update schema for EmailTemplate — all fields optional."""
    name: Optional[str] = Field(None, min_length=1, max_length=128)
    subject: Optional[str] = Field(None, min_length=1)
    body_html: Optional[str] = Field(None, min_length=1)


class TemplateOut(TemplateBase):
    """Response model returned from EmailTemplate read endpoints."""
    id: int
    tenant_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
