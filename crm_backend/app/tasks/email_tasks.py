# app/tasks/email_tasks.py
"""
Module: Email Background Tasks
Context: Pod C - Async Notifications

Processes the Email Queue.
Decouples the API (fast response) from the SMTP/Resend layer (slow/flaky).
"""

import logging
from app.core.celery_app import celery_app
from app.database import SessionLocal
from app.models.bulk import EmailQueue, BulkJob, BulkMessage
from app.services.email_service import Emailer
import time

logger = logging.getLogger(__name__)

@celery_app.task(name="send_email_task", bind=True, max_retries=3, default_retry_delay=60)
def send_email_task(self, email_job_id: int):
    """
    Celery task to process a specific email job from the DB queue.
    
    Args:
        email_job_id (int): Primary Key of the EmailQueue record.
    """
    db = SessionLocal()
    try:
        # 1. Fetch Job
        email_job = db.query(EmailQueue).filter(EmailQueue.id == email_job_id).first()
        
        if not email_job:
            logger.error(f"Email Task: Job {email_job_id} not found in DB.")
            return

        # 2. Initialize Service
        # The Emailer handles the Resend connection and template rendering
        emailer = Emailer()
        
        # 3. Attempt Delivery
        try:
            emailer.send_mail(
                to_email=email_job.to_email,
                subject=email_job.subject,
                template_name=email_job.template_name,
                context=email_job.context
            )
            
            # 4. Success Path
            email_job.status = "sent"
            # Reset error log if it succeeded after a retry
            email_job.last_error = None 
            logger.info(f"Email Task: Job {email_job_id} sent successfully.")
            
        except Exception as e:
            # 5. Failure Path
            logger.error(f"Email Task: Job {email_job_id} failed: {e}")
            
            email_job.last_error = str(e)
            email_job.attempts += 1
            
            # If we have retries left, the status remains 'pending' (or 'retrying')
            # If we are out of retries, we mark it 'failed'.
            if self.request.retries >= self.max_retries:
                email_job.status = "failed"
            
            # Commit the attempt count/error before retrying
            db.commit()
            
            # Trigger Celery Retry
            raise self.retry(exc=e)

        # Commit final success state
        db.commit()

    except Exception as e:
        # Catch-all for DB errors or other critical failures
        logger.critical(f"Email Task Critical Error: {e}")
        # We don't retry DB connection errors indefinitely to avoid hammering the DB
    finally:
        db.close()


@celery_app.task(name="process_bulk_email_job", bind=True, max_retries=1)
def process_bulk_email_job(self, job_id: int):
    """
    Celery task to execute a Bulk Email Job using BulkMessage rows.
    """
    db = SessionLocal()
    try:
        logger.info(f"Worker: Starting Bulk Email Job {job_id}")
        
        job = db.get(BulkJob, job_id)
        if not job:
            logger.error(f"Worker: Email Job {job_id} not found in DB.")
            return "Job Not Found"
            
        job.status = "running"
        db.commit()
        
        emailer = Emailer()
        
        while True:
            msgs = (
                db.query(BulkMessage)
                .filter(BulkMessage.job_id == job_id, BulkMessage.status == "pending")
                .limit(50)
                .all()
            )
            
            if not msgs:
                break
                
            for m in msgs:
                try:
                    subject = job.email_subject or "Broadcast Message"
                    
                    context = {}
                    if job.email_body:
                        context["body"] = job.email_body
                        
                    template_name = "custom" if job.email_body else job.template_name
                    
                    emailer.send_mail(
                        to_email=m.to_number,
                        subject=subject,
                        template_name=template_name,
                        context=context
                    )
                    m.status = "sent"
                except Exception as inner_e:
                    logger.warning(f"Job {job_id}: Failed to send email to {m.to_number}. Error: {inner_e}")
                    m.attempts += 1
                    m.status = "failed"
                    m.last_error = str(inner_e)
                    
            try:
                db.commit()
                time.sleep(1)
            except Exception as db_err:
                logger.error(f"Job {job_id}: DB Commit failed for email batch: {db_err}")
                db.rollback()
                break
                
        job.status = "completed"
        db.commit()
        logger.info(f"Worker: Bulk Email Job {job_id} finished")
        return f"Completed: {job.status}"
        
    except Exception as e:
        logger.critical(f"Worker: Bulk Email Job {job_id} CRASHED. Error: {e}")
        try:
            job = db.get(BulkJob, job_id)
            if job:
                job.status = "failed"
                db.commit()
        except:
            pass
        raise self.retry(exc=e, countdown=60)
    finally:
        db.close()