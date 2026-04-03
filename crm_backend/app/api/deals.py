# app/api/deals.py
"""
Module: Deals API Router
Context: Pod B - Inference Layer.

Exposes REST endpoints for Deals read operations.
Uses DealService for proper layering.
"""

import logging
from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.auth import User
from app.authentication.router import get_current_user
from app.schemas.crm import DealOut
from app.services.deal_service import DealService

router = APIRouter()
logger = logging.getLogger(__name__)

def get_service(db: Session = Depends(get_db)) -> DealService:
    return DealService(db)

@router.get("/", response_model=List[DealOut], status_code=status.HTTP_200_OK)
def list_deals(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    service: DealService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get a paginated list of deals for the authenticated user's tenant.
    """
    if not current_user.tenant_id:
        return []

    return service.list_deals(
        tenant_id=current_user.tenant_id,
        limit=limit,
        skip=skip
    )
