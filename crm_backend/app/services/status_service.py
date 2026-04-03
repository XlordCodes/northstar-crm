# app/services/status_service.py
"""
Module: Message Status Management
Context: Pod C - Module 6 (Reliability & Delivery Receipts).

This service processes WhatsApp delivery receipts (webhooks).
It ensures we track the lifecycle (Sent -> Delivered -> Read) accurately
and handles idempotent updates (ignoring duplicates).
All queries are scoped to tenant to prevent cross-tenant metric leakage.
"""

import logging
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import MessageStatus
from app.models import ChatMessage

logger = logging.getLogger(__name__)

class StatusService:
    def __init__(self, db: Session):
        self.db = db

    def update_status(self, tenant_id: int, wamid: str, new_status: str, error: str = None) -> MessageStatus | None:
        """
        Updates the delivery status of a message based on a webhook event.
        Scoped to tenant to prevent cross-tenant status manipulation.
        
        Args:
            tenant_id (int): The tenant context for security.
            wamid (str): WhatsApp Message ID (from the webhook).
            new_status (str): The new status (sent, delivered, read, failed).
            error (str, optional): Raw error message if failed.
        """
        # 1. Locate the original message — scoped to tenant
        chat_msg = self.db.query(ChatMessage).filter(
            ChatMessage.message_id == wamid,
            ChatMessage.tenant_id == tenant_id
        ).first()

        if not chat_msg:
            logger.warning(f"Status Update Ignored: Unknown WAMID {wamid} for tenant {tenant_id}")
            return None

        # 2. Find or Create the Status Record (Upsert)
        status_row = self.db.query(MessageStatus).filter(MessageStatus.message_id == chat_msg.id).first()

        if not status_row:
            status_row = MessageStatus(
                message_id=chat_msg.id,
                wa_status=new_status,
                last_error=error
            )
            self.db.add(status_row)
            logger.info(f"Tracking started for Msg {chat_msg.id}: {new_status}")
        else:
            # Idempotency Check
            if status_row.wa_status == "read" and new_status == "delivered":
                logger.debug(f"Ignoring stale status '{new_status}' for Msg {chat_msg.id}")
                return status_row

            status_row.wa_status = new_status
            if error:
                status_row.last_error = error
            
            logger.info(f"Status updated for Msg {chat_msg.id} -> {new_status}")

        # 3. Persist Changes
        try:
            self.db.commit()
            self.db.refresh(status_row)
            return status_row
        except Exception as e:
            logger.error(f"DB Commit failed for status update: {e}")
            self.db.rollback()
            raise

    def get_metrics(self, tenant_id: int) -> dict:
        """
        Aggregates current status counts for the dashboard.
        Scoped to tenant to prevent cross-tenant metric leakage.
        
        Args:
            tenant_id (int): The tenant context for filtering.
        """
        rows = self.db.query(
            MessageStatus.wa_status, func.count(MessageStatus.id)
        ).join(
            ChatMessage, MessageStatus.message_id == ChatMessage.id
        ).filter(
            ChatMessage.tenant_id == tenant_id
        ).group_by(MessageStatus.wa_status).all()

        return {status: count for status, count in rows}

    def get_message_status(self, tenant_id: int, message_id: int) -> MessageStatus | None:
        """
        Fetches the delivery status for a specific message, scoped to tenant.
        
        Args:
            tenant_id (int): The tenant context for filtering.
            message_id (int): The internal message ID.
        """
        return self.db.query(MessageStatus).join(
            ChatMessage, MessageStatus.message_id == ChatMessage.id
        ).filter(
            MessageStatus.message_id == message_id,
            ChatMessage.tenant_id == tenant_id
        ).first()
