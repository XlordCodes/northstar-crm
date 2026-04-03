# app/services/chat_service.py
"""
Module: Chat Service
Context: Pod C - Module 3, 4, 5.

The central nervous system that orchestrates:
1. Message Persistence (DB)
2. NLP Tagging (Simple)
3. Dispatching AI Tasks (Celery)
4. Generic Message CRUD (for API Routers)
"""

import logging
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models import Conversation, ChatMessage
from app.nlp.simple_nlp import SimpleNLPService

# Import task for async processing
from app.tasks.ai_tasks import process_message_ai

logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self, db: Session, nlp_service: SimpleNLPService | None = None):
        self.db = db
        self.nlp_service = nlp_service if nlp_service else SimpleNLPService()

    # --- Conversation Logic ---
    
    def upsert_conversation(self, tenant_id: int, customer_number: str, window_minutes=30) -> Conversation:
        """
        Finds an active conversation (within window) or creates a new one.
        Scoped to tenant to prevent cross-tenant conversation leaks.
        """
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(minutes=window_minutes)
        
        convo = self.db.query(Conversation)\
            .filter(Conversation.tenant_id == tenant_id,
                    Conversation.customer_number == customer_number,
                    Conversation.last_message_at > cutoff).first()

        if not convo:
            logger.info(f"Creating new conversation for {customer_number} (tenant={tenant_id}).")
            convo = Conversation(tenant_id=tenant_id, customer_number=customer_number)
            self.db.add(convo)
            self.db.commit()
            self.db.refresh(convo)
        
        return convo

    def list_conversation(self, tenant_id: int, convo_id: int, limit=50) -> List[ChatMessage]:
        """
        List messages for a specific conversation ID, scoped to tenant.
        """
        return self.db.query(ChatMessage)\
            .filter(ChatMessage.tenant_id == tenant_id,
                    ChatMessage.conversation_id == convo_id)\
            .order_by(ChatMessage.created_at.desc())\
            .limit(limit).all()

    # --- Message Ingestion (Webhook / Manual) ---

    def save_incoming(self, tenant_id: int, from_number: str, text: str, message_id: str = None, message_type: str = "text") -> ChatMessage:
        """
        Saves incoming message and triggers the background AI pipeline.
        This is the primary entry point for Webhooks and API manual creation.
        All records are scoped to the tenant.
        """
        try:
            convo = self.upsert_conversation(tenant_id, from_number)
            
            # 1. NLP Tagging (Sync - Fast Regex)
            nlp_data = self.nlp_service.analyze_text(text) 

            # 2. Save Message
            msg = ChatMessage(
                tenant_id=tenant_id,
                conversation_id=convo.id,
                from_number=from_number,
                text=text,
                message_id=message_id,
                message_type=message_type,
                language=nlp_data.get("language", "en"),
                intent=nlp_data.get("intent", "unknown"), 
                sentiment="neutral", # Updated by Celery later
                created_at=datetime.now(timezone.utc)
            )
            
            self.db.add(msg)
            
            # Update conversation timestamp to keep it "Active"
            convo.last_message_at = datetime.now(timezone.utc)
            
            self.db.commit()
            self.db.refresh(msg)
            
            # 3. Trigger Async AI Pipelines via Celery
            # Returns immediately so Webhook/API doesn't hang
            if message_type == "text":
                process_message_ai.delay(msg.id)

            return msg

        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to save incoming message from {from_number}: {e}")
            raise e

    # --- Generic Message CRUD (For Messages Router) ---
    
    def get_message(self, tenant_id: int, message_id: int) -> ChatMessage:
        """Fetch a single message by ID, scoped to tenant."""
        msg = self.db.query(ChatMessage).filter(
            ChatMessage.id == message_id,
            ChatMessage.tenant_id == tenant_id
        ).first()
        if not msg:
            raise ValueError("Message not found")
        return msg

    def list_messages(self, tenant_id: int, from_number: Optional[str] = None, message_type: Optional[str] = None, limit: int = 50) -> List[ChatMessage]:
        """
        Generic filterable list of messages, scoped to tenant.
        Used by the API to browse message history outside of a conversation context.
        """
        query = self.db.query(ChatMessage).filter(ChatMessage.tenant_id == tenant_id)
        
        if from_number:
            query = query.filter(ChatMessage.from_number == from_number)
        
        if message_type:
             query = query.filter(ChatMessage.message_type == message_type)
            
        return query.order_by(ChatMessage.created_at.desc()).limit(limit).all()

    def delete_message(self, tenant_id: int, message_id: int):
        """Hard delete a message, scoped to tenant."""
        msg = self.get_message(tenant_id, message_id)
        self.db.delete(msg)
        self.db.commit()

    def list_conversations(self, tenant_id: int, skip: int = 0, limit: int = 50) -> List[Conversation]:
        """
        Lists conversations for a specific tenant, ordered by most recent message.
        """
        return (
            self.db.query(Conversation)
            .filter(Conversation.tenant_id == tenant_id)
            .order_by(Conversation.last_message_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
