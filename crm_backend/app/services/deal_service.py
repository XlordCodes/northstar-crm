# app/services/deal_service.py
"""
Module: Deal Service
Context: Pod B - Module 1 (Business Logic)

Handles business logic for Deal management.
Wraps the DealRepo to provide a proper service layer for the API router.
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from app.repos.deal_repo import DealRepo


class DealService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = DealRepo(db)

    def list_deals(self, tenant_id: int, skip: int = 0, limit: int = 100) -> List:
        """
        Lists deals for a specific tenant with pagination.
        """
        return self.repo.list_all(tenant_id=tenant_id, skip=skip, limit=limit)

    def get_deal(self, tenant_id: int, deal_id: int):
        """
        Fetches a single deal by ID, scoped to tenant.
        """
        return self.repo.get(deal_id=deal_id, tenant_id=tenant_id)
