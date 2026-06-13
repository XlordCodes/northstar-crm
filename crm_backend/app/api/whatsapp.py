# app/api/whatsapp.py
"""
Module: WhatsApp API
Context: Pod C - Integrations

Exposes endpoints to send WhatsApp messages.
Delegates actual transmission logic to the robust 'whatsapp_client'.

SECURITY: All endpoints require JWT authentication.
"""

import logging
from typing import Optional, List, Any
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field

# Import the unified client we just created
from app.integrations.whatsapp_client import whatsapp_client
from app.authentication.router import get_current_user
from app.models.auth import User
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

class WhatsAppTemplateSendIn(BaseModel):
    """
    Request schema for sending a template message.
    """
    to: str = Field(..., description="Target WhatsApp number (e.g., '15550123456')")
    template_name: str = Field(..., description="The approved template name (e.g., 'hello_world')")
    language_code: str = Field(default="en_US", description="Template language code")
    
    # Flexible list for template variables (text, currency, etc.)
    parameters: Optional[List[Any]] = Field(default=None, description="List of variable values for the template body")

class WhatsAppTextSendIn(BaseModel):
    """
    Request schema for sending a plain text message.
    """
    to_number: str = Field(..., description="Target WhatsApp number (e.g., '15550123456')")
    message: str = Field(..., description="The message content to send")

@router.post("/whatsapp/send-template", status_code=status.HTTP_200_OK)
async def send_whatsapp_template(
    payload: WhatsAppTemplateSendIn,
    current_user: User = Depends(get_current_user)
):
    """
    Sends a WhatsApp template message.
    
    Uses the asynchronous WhatsApp client to ensure non-blocking I/O
    and automatic retries for transient network failures.
    
    SECURITY: Requires valid JWT authentication.
    
    Args:
        payload (WhatsAppTemplateSendIn): The template message details.
        current_user (User): The authenticated user making the request.
        
    Returns:
        dict: Status and provider response.
        
    Raises:
        HTTPException 500: If the message fails to send.
    """
    try:
        # Delegate to the integration client
        # Note: The client handles authentication and URL construction
        response = await whatsapp_client.send_template_async(
            to_number=payload.to,
            template_name=payload.template_name,
            language=payload.language_code,
            components=payload.parameters
        )
        
        return {
            "status": "sent", 
            "provider_response": response
        }
        
    except Exception as e:
        logger.error(f"WhatsApp API Error: {str(e)}")
        # Raise 500 but include the error message for debugging 
        # (In strict prod, mask this)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to send message: {str(e)}"
        )

@router.post("/whatsapp/send-text", status_code=status.HTTP_200_OK)
async def send_whatsapp_text(
    payload: WhatsAppTextSendIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sends a plain text WhatsApp message and logs it to the database.
    """
    try:
        from app.models.tenant import Tenant
        tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
        if not tenant or not tenant.wa_phone_number_id or not tenant.wa_access_token:
            raise HTTPException(status_code=400, detail="WhatsApp credentials not configured for tenant")
            
        response = await whatsapp_client.send_text_message(
            phone_number_id=tenant.wa_phone_number_id,
            access_token=tenant.wa_access_token,
            to_phone=payload.to_number,
            message=payload.message
        )
        
        from app.services.chat_service import ChatService
        from app.models.chat import ChatMessage
        from datetime import datetime, timezone
        
        chat_svc = ChatService(db)
        convo = chat_svc.upsert_conversation(current_user.tenant_id, payload.to_number)
        
        msg_id = None
        if response and isinstance(response, dict):
            messages = response.get("messages", [])
            if messages:
                msg_id = messages[0].get("id")

        msg = ChatMessage(
            tenant_id=current_user.tenant_id,
            conversation_id=convo.id,
            from_number="system",  # Denotes outgoing
            text=payload.message,
            message_id=msg_id,
            message_type="outgoing_text",
            created_at=datetime.now(timezone.utc)
        )
        db.add(msg)
        convo.last_message_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(msg)
        
        return {
            "status": "sent",
            "provider_response": response,
            "message_id": msg.id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"WhatsApp API Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to send text message: {str(e)}"
        )

