# app/services/sentiment_service.py
"""
Module: Sentiment Analysis Service
Context: Pod C - Module 5 (AI Sentiment).

Analyzes incoming chat message sentiment using OpenAI GPT.
Replaces the previous local HuggingFace Transformer model
to eliminate the ~2GB torch/transformers dependency footprint.
"""

import logging
from sqlalchemy.orm import Session
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from openai import OpenAI, APIConnectionError, RateLimitError

from app.models import ChatMessage
from app.core.config import settings

logger = logging.getLogger(__name__)


class SentimentService:
    def __init__(self, db: Session):
        self.db = db
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((APIConnectionError, RateLimitError))
    )
    def _classify_sentiment(self, text: str) -> str:
        """
        Calls OpenAI to classify sentiment as POSITIVE, NEGATIVE, or NEUTRAL.
        """
        if not self.client:
            logger.error("OPENAI_API_KEY is not configured.")
            return "neutral"

        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a sentiment classifier. "
                        "Analyze the sentiment of the user's text. "
                        "Reply with exactly one word: POSITIVE, NEGATIVE, or NEUTRAL."
                    )
                },
                {
                    "role": "user",
                    "content": text
                }
            ],
            temperature=0.0,
            max_tokens=5
        )

        raw = response.choices[0].message.content.strip().lower()

        # Normalize to known labels
        if raw in ("positive", "negative", "neutral"):
            return raw
        return "neutral"

    def analyze_and_store(self, message_id: int) -> str:
        """
        Analyzes the sentiment of a stored message and updates its record.
        """
        # 1. Fetch Message
        message = self.db.get(ChatMessage, message_id)
        if not message:
            logger.error(f"Message ID {message_id} not found.")
            return "error"

        # 2. Validation
        if not message.text or not message.text.strip():
            return "neutral"

        # 3. Inference via OpenAI
        try:
            # Truncate to 512 chars to limit token cost
            text_sample = message.text[:512]
            label = self._classify_sentiment(text_sample)

            # 4. Save Result
            message.sentiment = label
            self.db.commit()
            self.db.refresh(message)

            return label

        except Exception as e:
            logger.error(f"Sentiment analysis failed for Msg {message_id}: {e}")
            # Graceful fallback — never crash the Celery task
            return "neutral"