# app/api/tenants.py
"""
Module: Tenants API Router
Context: Pod A - Identity & Multi-Tenancy

Exposes endpoints for Tenant Management, specifically tailored
for configuring BYON third-party integrations (Resend, WhatsApp).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.auth import User
from app.models.tenant import Tenant
from app.core.permissions import require_admin
from app.schemas.tenant import TenantCredentialsUpdate, TenantOut

router = APIRouter(prefix="/tenants", tags=["Tenants"])


@router.patch("/{tenant_id}/credentials", response_model=TenantOut)
def update_tenant_credentials(
    tenant_id: int,
    payload: TenantCredentialsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin())
):
    """
    Updates the third-party integrations credentials for a tenant workspace.
    Restricted to Admin users only.
    """
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Tenant not found"
        )

    # Update only the provided fields
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tenant, key, value)
    
    db.commit()
    db.refresh(tenant)

    # Construct the safe response object
    # Calculate presence indicators based on the actual DB state
    response = TenantOut.model_validate(tenant)
    response.has_resend_key = bool(tenant.resend_api_key)
    response.has_wa_credentials = bool(tenant.wa_access_token and tenant.wa_phone_number_id)
    
    return response


@router.get("/{tenant_id}", response_model=TenantOut)
def get_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin())
):
    """
    Retrieve tenant details including configuration presence flags.
    """
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Tenant not found"
        )
        
    response = TenantOut.model_validate(tenant)
    response.has_resend_key = bool(tenant.resend_api_key)
    response.has_wa_credentials = bool(tenant.wa_access_token and tenant.wa_phone_number_id)
    
    return response
