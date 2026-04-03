# app/services/summary_service.py
"""
Module: Summary Service
Context: Pod C - AI Intelligence

Generates concise summaries of conversation history using OpenAI.
All operations are tenant-scoped to prevent cross-tenant data leakage.
"""

import logging
from sqlalchemy.orm import Session
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from openai import OpenAI, APIConnectionError, RateLimitError

from app.models import ChatMessage
from app.core.config import settings

logger = logging.getLogger(__name__)

class SummaryService:
    def __init__(self, db: Session):
        self.db = db
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((APIConnectionError, RateLimitError))
    )
    def summarize_conversation(self, tenant_id: int, convo_id: int) -> str:
        """
        Fetches recent messages and generates a summary using OpenAI GPT.
        Scoped to tenant to prevent cross-tenant conversation access.
        """
        if not self.client:
            logger.error("OPENAI_API_KEY not configured.")
            return "Summarization unavailable (Config Error)."

        # 1. Fetch History — scoped to tenant
        messages = (
            self.db.query(ChatMessage)
            .filter(ChatMessage.tenant_id == tenant_id,
                    ChatMessage.conversation_id == convo_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(20)
            .all()
        )
        
        if not messages:
            return "No messages to summarize."

        # 2. Format History (Chronological Order for LLM)
        history_text = "\n".join([f"{m.from_number}: {m.text}" for m in reversed(messages)])
        
        # 3. Call OpenAI
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a helpful assistant. Summarize the following customer support conversation in less than 100 words. Focus on the user's intent and any action items."
                    },
                    {
                        "role": "user", 
                        "content": history_text
                    }
                ],
                temperature=0.3,
                max_tokens=150
            )
            
            return response.choices[0].message.content.strip()

        except Exception as e:
            logger.error(f"OpenAI Summary failed for convo {convo_id}: {e}")
            return "Error generating summary."
