# app/api/deals.py
"""
Module: Deals API Router
Context: Pod B - Inference Layer.

Exposes REST endpoints for Deals read operations.
"""

import logging
from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.auth import User
from app.authentication.router import get_current_user
from app.schemas.crm import DealOut
from app.repos.deal_repo import DealRepo

router = APIRouter()
logger = logging.getLogger(__name__)

def get_repo(db: Session = Depends(get_db)) -> DealRepo:
    """Dependency injection of the DealRepo."""
    return DealRepo(db)

@router.get("/", response_model=List[DealOut], status_code=status.HTTP_200_OK)
def list_deals(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    repo: DealRepo = Depends(get_repo),
    current_user: User = Depends(get_current_user)
):
    """
    Get a paginated list of deals for the authenticated user's tenant.
    """
    if not current_user.tenant_id:
        return []

    return repo.list_all(
        tenant_id=current_user.tenant_id,
        limit=limit,
        skip=skip
    )
