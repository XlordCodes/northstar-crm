# app/api/bulk.py
"""
Module: Bulk Messaging API
Context: Pod C - Marketing & Broadcasts

Exposes endpoints to create and monitor broadcast campaigns.
Delegates logic to BulkService for performance and Celery for async execution.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone

# --- Imports ---
from app.database import get_db
from app.models.auth import User
from app.schemas.bulk import BulkJobCreate, BulkJobResponse, BulkJobStatus
from app.authentication.router import get_current_user
from app.services.bulk_service import BulkService

# Import the Celery tasks
from app.tasks.whatsapp_tasks import process_bulk_whatsapp_job
from app.tasks.email_tasks import send_email_task, process_bulk_email_job

router = APIRouter()

def get_service(db: Session = Depends(get_db)) -> BulkService:
    return BulkService(db)

@router.post("/jobs", response_model=BulkJobResponse, status_code=status.HTTP_201_CREATED)
def create_bulk_job(
    job_request: BulkJobCreate, 
    service: BulkService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """
    Creates a bulk messaging job record.
    Enforces authentication and assigns the job to the user's tenant.
    
    If 'scheduled_at' is in the past or null, the job triggers immediately.
    If in the future, it is saved as 'scheduled' (to be picked up by Celery Beat).
    """
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="User is not associated with a valid tenant."
        )

    initial_status = "queued"
    target_time = job_request.scheduled_at

    if target_time:
        now = datetime.now(timezone.utc)
        if target_time.tzinfo is None:
            target_time = target_time.replace(tzinfo=timezone.utc)
        if target_time > now:
            initial_status = "scheduled"
        else:
            target_time = None 

    channel = getattr(job_request, "channel", "whatsapp") or "whatsapp"
    emails = getattr(job_request, "emails", []) or []
    email_subject = getattr(job_request, "email_subject", "") or ""
    email_body = getattr(job_request, "email_body", "") or ""

    new_job = service.create_job(
        tenant_id=current_user.tenant_id,
        channel=channel,
        template_name=job_request.template_name,
        language_code=job_request.language_code,
        components=getattr(job_request, "components", []),
        numbers=job_request.numbers,
        emails=emails,
        email_subject=email_subject,
        email_body=email_body,
        scheduled_at=target_time,
        status=initial_status
    )

    if new_job.status == "queued":
        if channel == "email":
            process_bulk_email_job.delay(new_job.id)
        else:
            process_bulk_whatsapp_job.delay(new_job.id)

    return new_job

@router.get("/jobs", response_model=list[BulkJobResponse])
def list_bulk_jobs(
    skip: int = 0,
    limit: int = 50,
    service: BulkService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """
    List all bulk jobs for the current tenant.
    Enforces tenant isolation via service layer.
    """
    return service.list_jobs(
        tenant_id=current_user.tenant_id,
        skip=skip,
        limit=limit
    )

@router.get("/jobs/{job_id}", response_model=BulkJobStatus)
def get_job_status(
    job_id: int, 
    service: BulkService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get the status and message details of a bulk job.
    Enforces tenant isolation via service layer.
    """
    job = service.get_job_status(
        tenant_id=current_user.tenant_id,
        job_id=job_id
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return job
