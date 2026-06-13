# app/services/audit_service.py
"""
Module: Audit Service
Context: Pod B - Module 3 (Business Logic)

Central service for recording system events.
Correctly maps 'actor_id' (User ID) to the AuditLog model.
"""

from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

from app.models.audit import AuditLog, ActivityFeed
from app.repos.audit_repo import AuditRepo, ActivityRepo
from app.models.auth import User

# Import context helpers
try:
    from app.core.context import get_request_id
except ImportError:
    def get_request_id(): return None

class AuditService:
    def __init__(self, db: Session):
        # We initialize Repos directly here to ensure they are available
        self.db = db
        self.audit_repo = AuditRepo(db)
        self.activity_repo = ActivityRepo(db)

    def list_logs(
        self,
        tenant_id: int,
        entity: str | None = None,
        limit: int = 50,
        skip: int = 0
    ) -> list[AuditLog]:
        """
        Retrieves audit logs scoped to tenant via User join.
        """
        query = self.db.query(AuditLog).join(
            User, AuditLog.actor_id == User.id
        ).filter(
            User.tenant_id == tenant_id
        )
        if entity:
            query = query.filter(AuditLog.entity == entity)

        from sqlalchemy import desc
        return (
            query.order_by(desc(AuditLog.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_activity(self, user_id: int, limit: int = 20) -> list[ActivityFeed]:
        """
        Fetches recent activity for a specific user.
        """
        return self.activity_repo.recent_for_user(user_id=user_id, limit=limit)

    def get_smart_feed(
        self,
        tenant_id: int,
        current_user_id: int,
        limit: int = 20,
    ) -> list[ActivityFeed]:
        """
        Phase 12: Smart tenant-wide activity feed.

        Returns ALL events for the current user, plus only high-signal events
        (create, convert) for other team members within the same tenant.

        Args:
            tenant_id: Tenant scope for multi-tenancy enforcement.
            current_user_id: The logged-in user (all their events are shown).
            limit: Maximum number of records to return.
        """
        return self.activity_repo.get_smart_tenant_feed(
            tenant_id=tenant_id,
            current_user_id=current_user_id,
            limit=limit,
        )

    def log_event(
        self, 
        actor_id: Optional[int], 
        entity: str, 
        entity_id: int, 
        action: str, 
        changes: Dict[str, Any] = None,
        meta: Dict[str, Any] = None,
        tenant_id: Optional[int] = None
    ) -> AuditLog:
        """
        Records a compliance event.
        """
        final_meta = meta or {}
        
        # Auto-inject Trace ID
        trace_id = get_request_id()
        if trace_id:
            final_meta["trace_id"] = trace_id

        # --- CRITICAL MAPPING ---
        # The Model expects 'actor_id', NOT 'user_id'.
        log = AuditLog(
            tenant_id=tenant_id or 1,
            actor_id=actor_id,
            entity=entity,
            entity_id=entity_id,
            action=action,
            changes=changes or {},
            meta=final_meta
        )
        return self.audit_repo.add_log(log)

    def post_activity(self, user_id: int, message: str, category: str = "general") -> ActivityFeed:
        """
        Posts a user-facing activity message.
        """
        # --- CRITICAL MAPPING ---
        # The ActivityFeed Model expects 'user_id'.
        feed = ActivityFeed(
            user_id=user_id,     
            message=message, 
            category=category
        )
        return self.activity_repo.add(feed)

    def get_lead_timeline(
        self,
        lead_id: int,
        tenant_id: int,
        limit: int = 50,
    ) -> list[AuditLog]:
        """
        Retrieves the audit log timeline for a specific Lead entity.

        Phase 11: Provides chronological history of all actions on a lead
        (create, update, convert) scoped by tenant isolation.

        Args:
            lead_id: The ID of the lead whose timeline is requested.
            tenant_id: Tenant context for multi-tenancy enforcement.
            limit: Maximum number of records to return.

        Returns:
            List of AuditLog entries for this lead, newest first.
        """
        return self.audit_repo.list_logs(
            tenant_id=tenant_id,
            entity="Lead",
            entity_id=lead_id,
            limit=limit,
        )