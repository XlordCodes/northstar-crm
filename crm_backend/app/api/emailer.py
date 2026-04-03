# app/api/emailer.py
"""
Module: Emailer API
Context: Pod C - Email Integration

Queues emails for reliable background delivery.
Uses BulkService for proper layering and tenant isolation.
"""

import logging
from typing import Dict, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.authentication.router import get_current_user
from app.services.bulk_service import BulkService

from app.tasks.email_tasks import send_email_task

logger = logging.getLogger(__name__)

class EmailPayload(BaseModel):
    to_email: str
    subject: str
    template_name: str
    context: Optional[Dict] = {}

router = APIRouter()

def get_service(db: Session = Depends(get_db)) -> BulkService:
    return BulkService(db)

@router.post("/send-email")
def send_email_handler(
    data: EmailPayload, 
    service: BulkService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """
    Queues an email for reliable background delivery via Celery.
    Persists request to DB with tenant_id for audit trail.
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User not associated with a valid tenant.")

    try:
        email_job = service.create_email_job(
            tenant_id=current_user.tenant_id,
            to_email=data.to_email,
            subject=data.subject,
            template_name=data.template_name,
            context=data.context,
        )
        send_email_task.delay(email_job.id)
        
        return {"status": "queued", "job_id": email_job.id}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue email: {str(e)}")
