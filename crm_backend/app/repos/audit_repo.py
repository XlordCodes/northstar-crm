# app/repos/audit_repo.py
"""
Module: Audit & Activity Repositories
Context: Pod B - Data Access Layer

Handles the persistence and efficient retrieval of Audit Logs and Activity Feeds.
Strictly enforcing read/write patterns (Audits are typically append-only).
"""

from typing import List, Optional
from sqlalchemy.orm import Session, contains_eager
from sqlalchemy import desc, or_

from app.models.audit import AuditLog, ActivityFeed
from app.models.auth import User

class AuditRepo:
    """
    Repository for managing system compliance logs.
    """
    def __init__(self, db: Session):
        self.db = db

    def add_log(self, log: AuditLog) -> AuditLog:
        """
        Persists a new audit log entry to the database.
        
        Note: Does NOT commit. The transaction must be managed by the Service layer.
        Using flush() ensures the ID is generated for immediate use.
        """
        self.db.add(log)
        self.db.flush() 
        return log

    def list_logs(
        self, 
        tenant_id: int,
        entity: Optional[str] = None, 
        entity_id: Optional[int] = None, 
        actor_id: Optional[int] = None,
        limit: int = 50,
        skip: int = 0
    ) -> List[AuditLog]:
        """
        Retrieves a paginated list of audit logs based on filters.
        
        SECURITY: tenant_id is a required parameter to enforce multi-tenancy.
        Since AuditLog does not have a tenant_id column, we join with the User table
        to filter by the user's tenant membership.
        
        Args:
            tenant_id (int): The tenant context for multi-tenancy enforcement.
            entity (Optional[str]): Filter by entity type (e.g., 'Invoice', 'Lead').
            entity_id (Optional[int]): Filter by specific entity ID.
            actor_id (Optional[int]): Filter by the user who performed the action.
            limit (int): Maximum number of records to return.
            skip (int): Number of records to skip for pagination.
            
        Returns:
            List[AuditLog]: List of audit log entries for the tenant.
        """
        # Join with User table to enforce tenant isolation
        # AuditLog does not have tenant_id, so we filter via the actor's tenant
        query = self.db.query(AuditLog).join(
            User, AuditLog.actor_id == User.id
        ).filter(
            User.tenant_id == tenant_id
        )

        if entity:
            query = query.filter(AuditLog.entity == entity)
        
        if entity_id:
            query = query.filter(AuditLog.entity_id == entity_id)
            
        if actor_id:
            query = query.filter(AuditLog.actor_id == actor_id)
        
        return (
            query.order_by(desc(AuditLog.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )


class ActivityRepo:
    """
    Repository for managing user activity feeds.
    """
    def __init__(self, db: Session):
        self.db = db

    def add(self, activity: ActivityFeed) -> ActivityFeed:
        """
        Persists a new activity feed item.
        
        Note: Does NOT commit. The transaction must be managed by the Service layer.
        """
        self.db.add(activity)
        self.db.flush()
        return activity

    def recent_for_user(self, user_id: int, limit: int = 20) -> List[ActivityFeed]:
        """
        Fetches the most recent activity items for a specific user.
        """
        return (
            self.db.query(ActivityFeed)
            .filter(ActivityFeed.user_id == user_id)
            .order_by(desc(ActivityFeed.created_at))
            .limit(limit)
            .all()
        )

    def get_smart_tenant_feed(
        self,
        tenant_id: int,
        current_user_id: int,
        limit: int = 20,
    ) -> List[ActivityFeed]:
        """
        Smart tenant-wide activity feed.

        Phase 12: Returns ALL events for the current user, but only high-signal
        events (create, convert) for other team members in the same tenant.

        Uses a JOIN on User to enforce tenant isolation, and contains_eager
        to populate the ActivityFeed.user relationship without a duplicate join.

        Args:
            tenant_id: Tenant scope for multi-tenancy enforcement.
            current_user_id: The logged-in user (all their events are included).
            limit: Maximum number of records to return.

        Returns:
            List of ActivityFeed entries, newest first.
        """
        return (
            self.db.query(ActivityFeed)
            .join(User, ActivityFeed.user_id == User.id)
            .options(contains_eager(ActivityFeed.user))
            .filter(
                User.tenant_id == tenant_id,
                or_(
                    ActivityFeed.user_id == current_user_id,
                    ActivityFeed.category.in_(["create", "convert"]),
                ),
            )
            .order_by(desc(ActivityFeed.created_at))
            .limit(limit)
            .all()
        )
