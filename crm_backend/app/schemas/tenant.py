# app/schemas/tenant.py
"""
Module: Tenant Schemas
Context: Pod A - Identity & Multi-Tenancy

Pydantic models for Tenant read and write operations.

SECURITY NOTE:
  Raw credential values (resend_api_key, wa_access_token, etc.) are accepted
  on write operations but intentionally excluded from the standard TenantOut
  response model.  A future phase can return masked/redacted indicators
  (e.g. "re_****...abc1") instead of the raw key strings.
"""

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


# ---------------------------------------------------------------------------
# Base / shared properties
# ---------------------------------------------------------------------------

class TenantBase(BaseModel):
    """Properties shared by create and read operations."""
    name: str = Field(..., min_length=1, description="Human-readable workspace name")


# ---------------------------------------------------------------------------
# Write schemas  (credentials are accepted here)
# ---------------------------------------------------------------------------

class TenantCreate(TenantBase):
    """Payload for provisioning a new tenant workspace."""
    pass


class TenantUpdate(BaseModel):
    """
    Partial-update schema for a Tenant workspace.
    All fields are optional — only supplied fields are patched.
    """
    name: Optional[str] = Field(None, min_length=1)


class TenantCredentialsUpdate(BaseModel):
    """
    Dedicated schema for updating BYON integration credentials.
    Kept separate from TenantUpdate so that a privileged 'settings' endpoint
    can accept credentials without mixing them into general workspace updates.
    """
    resend_api_key: Optional[str] = Field(None, description="Resend API key for email delivery")
    wa_access_token: Optional[str] = Field(None, description="Meta WhatsApp Cloud API access token")
    wa_phone_number_id: Optional[str] = Field(None, description="Meta phone number ID (used for webhook routing)")
    wa_business_account_id: Optional[str] = Field(None, description="Meta WhatsApp Business Account ID")


# ---------------------------------------------------------------------------
# Read schemas  (credentials are NOT exposed)
# ---------------------------------------------------------------------------

class TenantOut(TenantBase):
    """
    Public response model for Tenant details.
    Raw credential strings are intentionally excluded.
    A boolean indicator shows whether each credential slot is configured,
    without revealing the key value itself.
    """
    id: int
    created_at: datetime

    # Presence indicators — True means the credential is set, False means empty.
    has_resend_key: bool = Field(False, description="Whether a Resend API key has been configured")
    has_wa_credentials: bool = Field(False, description="Whether WhatsApp credentials have been configured")

    model_config = ConfigDict(from_attributes=True)


class TenantOutFull(TenantBase):
    """
    INTERNAL / admin-only response that includes raw credential values.
    Must NOT be used on public API routes.
    """
    id: int
    created_at: datetime
    resend_api_key: Optional[str] = None
    wa_access_token: Optional[str] = None
    wa_phone_number_id: Optional[str] = None
    wa_business_account_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
