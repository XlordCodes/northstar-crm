# app/api/status.py
"""
Module: Reliability Dashboard API
Context: Pod C - Module 6 (Ops/Reliability).

Provides visibility into message delivery rates.
Intended for internal dashboards (e.g., Grafana or Admin UI).

SECURITY: All endpoints require JWT authentication.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.status_service import StatusService
from app.authentication.router import get_current_user
from app.models.auth import User

router = APIRouter()

def get_service(db: Session = Depends(get_db)) -> StatusService:
    return StatusService(db)

@router.get("/summary")
def status_summary(
    service: StatusService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get aggregate counts of message statuses (sent, delivered, read, failed).
    Scoped to tenant via service layer.
    """
    return service.get_metrics(current_user.tenant_id)

@router.get("/queues")
def system_queues(
    current_user: User = Depends(get_current_user)
):
    """
    Returns known Celery worker tasks and their schedules.
    """
    return {
        "tasks": [
            {
                "name": "process_bulk_whatsapp_job",
                "description": "Executing bulk WhatsApp broadcast jobs",
                "schedule_seconds": None,
                "category": "messaging"
            },
            {
                "name": "send_email_task",
                "description": "Processing email queue (transactional emails)",
                "schedule_seconds": None,
                "category": "email"
            },
            {
                "name": "process_message_ai",
                "description": "Sentiment analysis and vector embedding",
                "schedule_seconds": None,
                "category": "ai"
            },
            {
                "name": "check_scheduled_jobs",
                "description": "Triggering scheduled broadcast campaigns",
                "schedule_seconds": 60,
                "category": "scheduler"
            },
            {
                "name": "retry_failed_bulk_messages",
                "description": "Retrying failed WhatsApp messages",
                "schedule_seconds": 300,
                "category": "retry"
            }
        ]
    }

@router.get("/message/{msg_id}")
def message_status(
    msg_id: int, 
    service: StatusService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get the detailed delivery status for a specific message ID.
    Scoped to tenant via service layer.
    """
    row = service.get_message_status(current_user.tenant_id, msg_id)
    if not row:
        raise HTTPException(status_code=404, detail="Status not found for this message")
    
    return {
        "message_id": msg_id, 
        "status": row.wa_status,
        "last_error": row.last_error,
        "updated_at": row.updated_at
    }
