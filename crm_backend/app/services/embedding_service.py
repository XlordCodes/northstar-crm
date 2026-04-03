# app/services/embedding_service.py
"""
Module: Embedding Service
Context: Pod C - Module 5 (AI RAG)

Generates vector embeddings for chat messages using the OpenAI API.
Stores vectors in PostgreSQL using pgvector for semantic search.
All operations are tenant-scoped to prevent cross-tenant data leakage.

ARCHITECTURAL NOTE:
- Model: text-embedding-3-small
- Dimensions: 1536 
"""

import requests
import logging
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import text
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.models.extensions import MessageEmbedding
from app.models import ChatMessage
from app.core.config import settings

logger = logging.getLogger(__name__)

OPENAI_EMBED_URL = "https://api.openai.com/v1/embeddings"

class EmbeddingService:
    def __init__(self, db: Session):
        self.db = db

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(requests.exceptions.RequestException)
    )
    def embed_text(self, text: str) -> List[float]:
        """
        Generates a vector embedding (1536 dims) for the given text using OpenAI.
        """
        if not settings.OPENAI_API_KEY:
            logger.error("OPENAI_API_KEY is not configured.")
            raise ValueError("OPENAI_API_KEY is not configured.")

        safe_text = text[:20000] 

        payload = {
            "model": "text-embedding-3-small",
            "input": safe_text
        }
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }

        try:
            response = requests.post(OPENAI_EMBED_URL, json=payload, headers=headers, timeout=20)
            
            if response.status_code != 200:
                logger.error(f"OpenAI API Error: {response.text}")
                response.raise_for_status()

            data = response.json()
            
            if "data" not in data or not data["data"]:
                raise ValueError("Invalid response from OpenAI API")
            
            return data["data"][0]["embedding"]
            
        except requests.exceptions.RequestException as e:
            logger.warning(f"OpenAI API connection failed (attempting retry): {e}")
            raise

    def store_embedding(self, tenant_id: int, message_id: int, vector: List[float], commit: bool = True) -> MessageEmbedding:
        """
        Save the vector to the database, scoped to tenant.
        Checks for existing records to ensure idempotency.
        """
        existing = self.db.query(MessageEmbedding).filter(
            MessageEmbedding.message_id == message_id,
            MessageEmbedding.tenant_id == tenant_id
        ).first()
        
        if existing:
            existing.embedding = vector
            emb = existing
        else:
            emb = MessageEmbedding(tenant_id=tenant_id, message_id=message_id, embedding=vector)
            self.db.add(emb)
        
        if commit:
            self.db.commit()
            self.db.refresh(emb)
            
        return emb

    def search_similar(self, tenant_id: int, vector: List[float], limit: int = 5):
        """
        Search for similar messages using Cosine Distance via pgvector.
        STRICTLY scoped to tenant to prevent cross-tenant data leakage.
        """
        sql = text("""
            SELECT message_id, embedding <=> :vec as distance 
            FROM message_embeddings
            WHERE tenant_id = :tenant_id
            ORDER BY distance ASC
            LIMIT :limit
        """)
        
        try:
            rows = self.db.execute(sql, {"vec": str(vector), "tenant_id": tenant_id, "limit": limit}).fetchall()
            return rows
        except Exception as e:
            logger.error(f"Error executing similarity search: {e}")
            raise
