# app/services/email_service.py
"""
Module: Email Service
Context: Pod C - Notifications

Handles transactional email delivery via Resend.
Includes Jinja2 template rendering and automatic retries for API resilience.
"""

import logging
from pathlib import Path
from typing import Any, Dict, Optional
import resend
from jinja2 import Environment, FileSystemLoader, select_autoescape
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.core.config import settings

logger = logging.getLogger(__name__)

# Resolve paths robustly
# logic: app/services/email_service.py -> app/services -> app -> root -> templates
BASE_DIR = Path(__file__).resolve().parent.parent.parent
TEMPLATE_DIR = BASE_DIR / "templates"

class Emailer:
    """
    Singleton-style service for handling email dispatch.
    """
    def __init__(self):
        # Initialize Jinja2
        TEMPLATE_DIR.mkdir(parents=True, exist_ok=True)
        self.template_env = Environment(
            loader=FileSystemLoader(str(TEMPLATE_DIR)),
            autoescape=select_autoescape(["html", "xml"])
        )

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((ConnectionError,))
    )
    def send_mail(
        self, 
        api_key: str,
        to_email: str, 
        subject: str, 
        template_name: str, 
        context: Optional[Dict[str, Any]] = None, 
        from_email: Optional[str] = None
    ):
        """
        Renders a template and sends an email via Resend natively for the supplied tenant.
        """
        if not api_key:
            logger.warning(f"⚠️ Resend API Key missing. Email to {to_email} suppressed.")
            return

        # Set the key for this execution
        resend.api_key = api_key

        sender = from_email or settings.DEFAULT_SENDER_EMAIL or "onboarding@resend.dev"
        
        try:
            # 1. Render Template
            # For bulk campaigns, template_name='custom' means the body is
            # user-supplied HTML passed via context['body']. We skip Jinja
            # rendering to avoid TemplateNotFound and double-escaping.
            if template_name == "custom":
                raw_body = (context or {}).get("body", "")
                html_content = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px">
{raw_body}
</body></html>"""
            else:
                template = self.template_env.get_template(template_name)
                html_content = template.render(context or {})
            
            # 2. Construct Message and Send (with Retry)
            response = resend.Emails.send({
                "from": sender,
                "to": to_email,
                "subject": subject,
                "html": html_content
            })
            
            logger.info(f"✅ Email sent to {to_email} (Template: {template_name}) - Resend ID: {response.get('id', 'unknown')}")
            
        except Exception as e:
            logger.error(f"❌ Email Failed to {to_email}: {str(e)}")
            raise # Re-raise to trigger Tenacity retry
