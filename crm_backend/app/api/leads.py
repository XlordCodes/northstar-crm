# app/api/leads.py
"""
Module: Leads API Router
Context: Pod B - Interface Layer (Module 1).

Exposes REST endpoints for managing Leads and promoting them to Deals.
Delegates all business logic to LeadService.

SECURITY CONTROLS:
- Duplicate email detection on create
- Owner validation on create
- State lock on converted leads (cannot edit)
"""

import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

# --- Core Imports ---
from app.database import get_db
from app.authentication.router import get_current_user
from app.models.auth import User

# --- Domain Imports ---
from app.services.lead_service import LeadService
from app.services.audit_service import AuditService
from app.schemas.crm import LeadCreate, LeadUpdate, LeadOut, DealOut, BulkLeadDelete, BulkLeadUpdate, BulkLeadCreate
from app.schemas.audit import AuditLogOut

# Initialize Router
router = APIRouter()
logger = logging.getLogger(__name__)

# --- Dependency Injection ---

def get_service(db: Session = Depends(get_db)) -> LeadService:
    """
    Factory function to instantiate the LeadService.
    
    CRITICAL FIX: We pass only the 'db' session. 
    The Service handles initializing its own Repositories internally.
    """
    return LeadService(db)

def get_audit_service(db: Session = Depends(get_db)) -> AuditService:
    """Factory function to instantiate AuditService for timeline queries."""
    return AuditService(db)

# --- Endpoints ---

@router.post("/", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
def create_lead(
    lead_in: LeadCreate,
    service: LeadService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new Lead.
    
    - Enforces tenant isolation (Lead belongs to User's Tenant).
    - Sets the current user as the Lead owner.
    """
    if not current_user.tenant_id:
         raise HTTPException(
             status_code=status.HTTP_400_BAD_REQUEST, 
             detail="User is not associated with a valid tenant."
         )
         
    return service.create_lead(
        tenant_id=current_user.tenant_id, 
        owner_id=current_user.id, 
        data=lead_in
    )

@router.get("/", response_model=List[LeadOut])
def list_leads(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    statuses: Optional[List[str]] = Query(default=None, alias="statuses"),
    owner_id: Optional[int] = Query(default=None),
    created_after: Optional[datetime] = Query(default=None),
    service: LeadService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get a paginated list of leads for the current tenant.
    """
    if not current_user.tenant_id:
        return []

    # Sanitize empty list to None so repo skips the filter
    safe_statuses = statuses if statuses else None

    return service.list_leads(
        tenant_id=current_user.tenant_id, 
        limit=limit, 
        skip=skip,
        statuses=safe_statuses,
        owner_id=owner_id,
        created_after=created_after
    )

@router.post("/bulk-import", status_code=status.HTTP_201_CREATED)
def bulk_import_leads(
    payload: BulkLeadCreate,
    service: LeadService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """
    Import a batch of pre-mapped leads into the system.
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User has no tenant.")
        
    created_count = service.bulk_create_leads(
        tenant_id=current_user.tenant_id,
        owner_id=current_user.id,
        leads_data=payload.leads
    )
    return {"status": "success", "imported_count": created_count}

@router.post("/bulk-delete", status_code=status.HTTP_200_OK)
def bulk_delete_leads(
    payload: BulkLeadDelete,
    service: LeadService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """
    Delete multiple leads at once.
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User has no tenant.")
    
    deleted_count = service.bulk_delete_leads(current_user.tenant_id, payload.lead_ids)
    return {"status": "success", "deleted_count": deleted_count}

@router.patch("/bulk-update", response_model=List[LeadOut])
def bulk_update_leads(
    payload: BulkLeadUpdate,
    service: LeadService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """
    Update multiple leads at once.
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User has no tenant.")
    
    # payload.updates is a plain Dict[str, Any] — pass it directly
    return service.bulk_update_leads(
        tenant_id=current_user.tenant_id,
        lead_ids=payload.lead_ids,
        updates=payload.updates
    )

@router.patch("/{lead_id}", response_model=LeadOut)
def update_lead(
    lead_id: int,
    lead_in: LeadUpdate,
    service: LeadService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """
    Update a Lead's details (name, email).
    
    SECURITY: Converted leads cannot be modified.
    
    Returns:
        Updated lead object
        
    Raises:
        400: If lead is converted (immutable)
        404: If lead not found
    """
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no tenant."
        )
    
    try:
        return service.update_lead(
            tenant_id=current_user.tenant_id,
            lead_id=lead_id,
            updates=lead_in.model_dump(exclude_unset=True)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error updating lead {lead_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update lead."
        )

@router.post("/{lead_id}/convert", response_model=DealOut)
def convert_lead_to_deal(
    lead_id: int,
    value_cents: int = Query(..., description="Estimated value of the deal in cents", ge=0),
    service: LeadService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """
    Promote a Lead to a Deal.
    
    - Atomic Operation: Updates Lead status -> Creates Deal -> Fires Event.
    - Idempotent: Will fail if Lead is already converted.
    """
    if not current_user.tenant_id:
         raise HTTPException(
             status_code=status.HTTP_400_BAD_REQUEST, 
             detail="User has no tenant."
         )

    try:
        return service.promote_to_deal(
            tenant_id=current_user.tenant_id,
            lead_id=lead_id,
            value_cents=value_cents,
            seller_id=current_user.id
        )
    except ValueError as e:
        # Catch business rule violations (e.g. "Lead already converted")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        # Catch unexpected server errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to promote lead."
        )

@router.get("/{lead_id}/timeline", response_model=List[AuditLogOut])
def get_lead_timeline(
    lead_id: int,
    limit: int = Query(50, ge=1, le=200),
    audit_service: AuditService = Depends(get_audit_service),
    current_user: User = Depends(get_current_user),
):
    """
    Get the audit log timeline for a specific Lead.

    Phase 11: Returns chronological history of all actions (create, update, convert)
    performed on this lead, scoped by tenant isolation.
    """
    if not current_user.tenant_id:
        return []

    return audit_service.get_lead_timeline(
        lead_id=lead_id,
        tenant_id=current_user.tenant_id,
        limit=limit,
    )