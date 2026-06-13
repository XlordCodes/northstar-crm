# app/services/lead_service.py
"""
Module: Lead Service
Context: Pod B - Business Logic Layer.

Orchestrates the lifecycle of Leads, including creation, listing, and the critical
'promote_to_deal' workflow.
Uses dependency injection for Repositories and the Event Bus.

SECURITY CONTROLS:
- Duplicate email detection (prevents duplicate leads)
- Owner validation (ensures owner exists and belongs to tenant)
- State lock on converted leads (prevents editing immutable leads)
"""

import asyncio
import logging
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

# Import Event Bus Bridge
from app.core.event_bus import event_bus, get_main_loop
from datetime import datetime

# Import Models, Schemas, and Events
from app.schemas.crm import LeadCreate, LeadUpdate
from app.models.crm import Lead, Deal
from app.models.auth import User
from app.events.crm_events import DealCreated

# Import Repositories
from app.repos.lead_repo import LeadRepo
from app.repos.deal_repo import DealRepo

# Import Audit Service (Phase 11)
from app.services.audit_service import AuditService

logger = logging.getLogger(__name__)

class LeadService:
    """
    Service class containing pure business logic for Leads.
    """
    def __init__(self, db: Session):
        """
        Initialize the service with a DB session.
        Instantiates required Repositories and AuditService immediately.
        
        Args:
            db (Session): The active SQLAlchemy session.
        """
        self.db = db
        self.lead_repo = LeadRepo(db)
        self.deal_repo = DealRepo(db)
        self.audit_service = AuditService(db)

    def create_lead(self, tenant_id: int, owner_id: int, data: LeadCreate) -> Lead:
        """
        Creates a new lead using the LeadRepo.
        
        SECURITY VALIDATIONS:
        1. Duplicate Email Check: Prevents creating leads with duplicate emails
        2. Owner Validation: Ensures owner exists and belongs to the tenant
        
        Args:
            tenant_id (int): The tenant context.
            owner_id (int): The user creating the lead.
            data (LeadCreate): Validated input data.
            
        Returns:
            Lead: The persisted lead object.
            
        Raises:
            HTTPException: 400 if validation fails
        """
        # =====================================================================
        # SECURITY VALIDATION 1: Duplicate Email Check
        # =====================================================================
        if data.email:
            existing_lead = (
                self.db.query(Lead)
                .filter(
                    Lead.tenant_id == tenant_id,
                    Lead.email == data.email
                )
                .first()
            )
            
            if existing_lead:
                logger.warning(
                    f"Duplicate lead creation attempt: email '{data.email}' "
                    f"already exists for tenant {tenant_id} (Lead ID: {existing_lead.id})"
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Lead with email '{data.email}' already exists."
                )
        
        # =====================================================================
        # SECURITY VALIDATION 2: Owner Validation
        # =====================================================================
        owner = self.db.query(User).filter(User.id == owner_id).first()
        
        if not owner:
            logger.warning(
                f"Invalid owner_id {owner_id} - user does not exist"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid owner_id: User does not exist."
            )
        
        if owner.tenant_id != tenant_id:
            logger.warning(
                f"Cross-tenant lead assignment attempt: owner {owner_id} "
                f"(tenant {owner.tenant_id}) cannot own lead in tenant {tenant_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid owner_id: User belongs to another tenant."
            )
        
        # All validations passed - create the lead
        lead = self.lead_repo.create(tenant_id, owner_id, data)

        # Phase 11: Record audit trail for lead creation
        self.audit_service.log_event(
            actor_id=owner_id,
            entity="Lead",
            entity_id=lead.id,
            action="create",
            changes={"name": lead.name, "email": lead.email, "status": lead.status},
            tenant_id=tenant_id,
        )

        # Phase 12: Post to global activity feed
        self.audit_service.post_activity(
            user_id=owner_id,
            message=f"Created a new lead: {lead.name}",
            category="create",
        )

        self.db.commit()
        self.db.refresh(lead)
        return lead

    def bulk_create_leads(self, tenant_id: int, owner_id: int, leads_data: List[LeadCreate]) -> int:
        """
        Bulk insert leads.
        """
        if not leads_data:
            return 0
            
        new_leads = [
            Lead(
                tenant_id=tenant_id,
                owner_id=owner_id,
                name=lead.name,
                email=lead.email,
                phone=lead.phone,
                status="new"
            )
            for lead in leads_data
        ]
        
        self.db.add_all(new_leads)
        self.db.commit()
        
        count = len(new_leads)
        self.audit_service.post_activity(
            user_id=owner_id,
            message=f"Imported {count} new leads via CSV",
            category="create",
        )
        
        return count

    def list_leads(
        self, 
        tenant_id: int, 
        limit: int = 100, 
        skip: int = 0,
        statuses: Optional[List[str]] = None,
        owner_id: Optional[int] = None,
        created_after: Optional[datetime] = None
    ) -> List[Lead]:
        """
        Retrieves a paginated list of leads for the tenant.
        
        Args:
            tenant_id (int): The tenant context.
            limit (int): Max records to return.
            skip (int): Pagination offset.
            
        Returns:
            List[Lead]: A list of lead objects.
        """
        return self.lead_repo.list_all(
            tenant_id=tenant_id, 
            limit=limit, 
            skip=skip,
            statuses=statuses,
            owner_id=owner_id,
            created_after=created_after
        )
    
    def update_lead(self, tenant_id: int, lead_id: int, updates: dict) -> Lead:
        """
        Updates a lead's details (name, email, status).
        
        SECURITY VALIDATION:
        - State Lock: Prevents editing converted leads (immutable)
        - Manual Conversion Bypass: Prevents patching status to 'converted' directly
        
        Args:
            tenant_id (int): Tenant context for isolation
            lead_id (int): ID of the lead to update
            updates (dict): Dictionary of fields to update
            
        Returns:
            Lead: Updated lead object
            
        Raises:
            HTTPException: 400 if lead is converted, if bypass attempted, or not found
        """
        # 1. Fetch the lead
        lead = self.lead_repo.get(lead_id, tenant_id)
        
        if not lead:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lead not found"
            )
        
        # =====================================================================
        # SECURITY VALIDATION: State Lock on Converted Leads
        # =====================================================================
        # CRITICAL: Converted leads are immutable - they represent historical data
        # that has been promoted to a Deal. Allowing edits would break data integrity.
        if lead.status == "converted":
            logger.warning(
                f"Attempted edit of converted lead {lead_id} by tenant {tenant_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot modify a converted lead. Converted leads are immutable."
            )

        # SECURITY VALIDATION: Prevent manual conversion bypass
        if updates.get("status") == "converted":
            logger.warning(f"Attempted to bypass conversion workflow for lead {lead_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Leads cannot be manually patched to 'converted'. Use the /convert endpoint."
            )
        
        # 3. Capture before-state for audit diff (Phase 11)
        allowed_fields = {'name', 'email', 'status'}
        changes: dict = {}
        for key, value in updates.items():
            if key in allowed_fields:
                old_value = getattr(lead, key)
                if old_value != value:
                    changes[key] = {"old": old_value, "new": value}
                setattr(lead, key, value)

        # Phase 11: Record audit trail for lead update (only if fields actually changed)
        if changes:
            self.audit_service.log_event(
                actor_id=lead.owner_id,
                entity="Lead",
                entity_id=lead_id,
                action="update",
                changes=changes,
                tenant_id=tenant_id,
            )

            # Phase 12: Post to global activity feed
            self.audit_service.post_activity(
                user_id=lead.owner_id,
                message=f"Updated lead: {lead.name}",
                category="update",
            )

        self.db.commit()
        self.db.refresh(lead)
        
        logger.info(f"Updated lead {lead_id} for tenant {tenant_id}")
        return lead
        
    def bulk_delete_leads(self, tenant_id: int, lead_ids: List[int]) -> int:
        """
        Deletes multiple leads for a tenant.
        """
        leads = self.db.query(Lead).filter(Lead.id.in_(lead_ids)).all()
        for lead in leads:
            if lead.tenant_id != tenant_id:
                logger.warning(f"Bulk Delete: Tenant {tenant_id} attempted to delete lead {lead.id} from tenant {lead.tenant_id}")
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more leads do not belong to the tenant.")
        
        deleted_count = len(leads)
        for lead in leads:
            self.db.delete(lead)
        self.db.commit()
        return deleted_count

    def bulk_update_leads(self, tenant_id: int, lead_ids: List[int], updates: dict) -> List[Lead]:
        """
        Updates multiple leads for a tenant.
        """
        leads = self.db.query(Lead).filter(Lead.id.in_(lead_ids)).all()
        
        # Validation pass
        for lead in leads:
            if lead.tenant_id != tenant_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more leads do not belong to the tenant.")
            if lead.status == "converted":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot modify converted lead {lead.id}.")
                
        if updates.get("status") == "converted":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot bulk update to converted.")

        allowed_fields = {'name', 'email', 'status', 'owner_id', 'phone'}
        for lead in leads:
            changes = {}
            for key, value in updates.items():
                if key in allowed_fields and value is not None:
                    old_value = getattr(lead, key)
                    if old_value != value:
                        changes[key] = {"old": old_value, "new": value}
                    setattr(lead, key, value)
            
            if changes:
                self.audit_service.log_event(
                    actor_id=lead.owner_id,
                    entity="Lead",
                    entity_id=lead.id,
                    action="update",
                    changes=changes,
                    tenant_id=tenant_id,
                )
                self.audit_service.post_activity(
                    user_id=lead.owner_id,
                    message=f"Updated lead in bulk: {lead.name}",
                    category="update",
                )

        self.db.commit()
        for lead in leads:
            self.db.refresh(lead)
        return leads

    def promote_to_deal(
        self, 
        tenant_id: int, 
        lead_id: int, 
        value_cents: int, 
        seller_id: Optional[int] = None
    ) -> Deal:
        """
        Atomic Workflow: Promote a Lead to a Deal.
        
        Business Rules:
        1. Lead must exist and belong to the tenant.
        2. Lead must not be already converted.
        3. Atomicity: DB Commit + Event Publication.
        
        Args:
            tenant_id (int): Context tenant.
            lead_id (int): ID of the lead to promote.
            value_cents (int): Value of the new deal.
            seller_id (Optional[int]): ID of the sales agent.
            
        Returns:
            Deal: The newly created deal.
            
        Raises:
            ValueError: If logic preconditions fail.
            SQLAlchemyError: If database persistence fails.
        """
        try:
            # 1. Fetch Lead (Read)
            lead = self.lead_repo.get(lead_id, tenant_id)
            if not lead:
                raise ValueError("Lead not found")

            # 2. Check Business Rule: Idempotency
            if lead.status == "converted":
                raise ValueError("Lead has already been converted")

            # 3. Create Deal (Write 1)
            # Note: Repo methods use 'flush' so we stay in the same transaction
            deal = self.deal_repo.create(
                tenant_id=tenant_id,
                lead_id=lead.id,
                value_cents=value_cents,
                seller_id=seller_id
            )

            # 4. Update Lead Status (Write 2)
            self.lead_repo.update_status(lead, "converted")
            
            # 5. Commit Transaction (Atomic DB Operation)
            self.db.commit()
            self.db.refresh(deal)
            
            # 6. Publish Domain Event (Fire-and-Forget)
            # Since this Service runs in a ThreadPool (Sync), we must dispatch
            # the event to the Main Asyncio Loop to allow background processing.
            event = DealCreated(
                tenant_id=tenant_id,
                deal_id=deal.id,
                lead_id=lead.id,
                value_cents=value_cents,
                seller_id=seller_id
            )
            
            main_loop = get_main_loop()
            if main_loop and main_loop.is_running():
                asyncio.run_coroutine_threadsafe(event_bus.publish(event), main_loop)
            
            return deal

        except SQLAlchemyError as e:
            # Rollback ensuring no partial data state (e.g. Deal created but Lead not updated)
            self.db.rollback()
            raise e