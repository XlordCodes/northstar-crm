# app/tasks/retry_tasks.py
"""
Module: Retry Worker
Context: Pod C - Async Infrastructure

A dedicated periodic task that acts as a 'Dead Letter Queue' processor.
It scans for messages stuck in 'failed' state and retries them automatically.
"""

import logging
from sqlalchemy.orm import joinedload
from app.core.celery_app import celery_app
from app.database import SessionLocal
from app.models.bulk import BulkMessage
from app.integrations.whatsapp_client import whatsapp_client
from app.services.email_service import Emailer

logger = logging.getLogger(__name__)

# Constants
MAX_RETRIES = 3

@celery_app.task(name="retry_failed_bulk_messages")
def retry_failed_bulk_messages():
    """
    Periodic Task: Scans for failed bulk messages and retries them.
    """
    db = SessionLocal()
    try:
        # 1. Fetch candidates (Status=failed, Attempts < Max)
        # We use joinedload(BulkMessage.job) to fetch the template details in the SAME query.
        failed_msgs = (
            db.query(BulkMessage)
            .options(joinedload(BulkMessage.job))
            .filter(
                BulkMessage.status == "failed",
                BulkMessage.attempts < MAX_RETRIES
            )
            .limit(50) # Batch size to prevent memory spikes
            .all()
        )

        if not failed_msgs:
            return

        logger.info(f"Retry Worker: Found {len(failed_msgs)} messages to retry.")

        success_count = 0
        
        for msg in failed_msgs:
            job = msg.job
            if not job:
                logger.error(f"Data Integrity Error: Message {msg.id} has no parent Job.")
                continue

            try:
                # 2. Attempt Resend — route by channel
                logger.info(f"Retrying Message {msg.id} to {msg.to_number} (Attempt {msg.attempts + 1})")
                
                channel = getattr(job, "channel", "whatsapp") or "whatsapp"
                
                if channel == "email":
                    emailer = Emailer()
                    subject = job.email_subject or "Broadcast Message"
                    context = {"body": job.email_body} if job.email_body else {}
                    template_name = "custom" if job.email_body else job.template_name
                    emailer.send_mail(
                        to_email=msg.to_number,
                        subject=subject,
                        template_name=template_name,
                        context=context
                    )
                else:
                    response = whatsapp_client.send_template_sync(
                        to_number=msg.to_number,
                        template_name=job.template_name,
                        language=job.language_code,
                        components=job.components
                    )
                    # Extract the new WAMID from the response if available
                    if response and "messages" in response:
                        msg.whatsapp_message_id = response["messages"][0].get("id")
                
                # 3. Success Path
                msg.status = "sent"
                msg.last_error = None
                msg.attempts += 1
                success_count += 1
                
            except Exception as e:
                # 4. Failure Path
                msg.attempts += 1
                msg.last_error = f"Retry Error: {str(e)}"
                
                # If max reached, it stays 'failed' permanently (Dead Letter)
                if msg.attempts >= MAX_RETRIES:
                    logger.error(f"Message {msg.id} permanently failed after {MAX_RETRIES} attempts.")
                
            # Commit per message (or small batches) to avoid one failure rolling back all retries
            try:
                db.commit()
            except Exception as commit_err:
                logger.error(f"DB Commit failed for retry {msg.id}: {commit_err}")
                db.rollback()

        if success_count > 0:
            logger.info(f"Retry Worker: Successfully recovered {success_count} messages.")

    except Exception as e:
        logger.error(f"Critical Retry Worker Error: {e}")
    finally:
        db.close()