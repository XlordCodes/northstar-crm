# --- app/api/chat.py ---
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Any

from app.database import get_db 
from app.services.chat_service import ChatService
from app.models import Conversation, ChatMessage, User
# Import the Auth Dependency to lock down the endpoints
from app.authentication.router import get_current_user

router = APIRouter()

@router.get("/conversations")
def list_conversations(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists active conversations ordered by the most recent message.
    Scoped to the authenticated user's tenant.
    """
    chat_svc = ChatService(db)
    conversations = chat_svc.list_conversations(
        tenant_id=current_user.tenant_id,
        skip=skip,
        limit=limit
    )
    return conversations

@router.get("/conversations/{cid}")
def get_messages(
    cid: int, 
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches message history for a specific conversation ID.
    Scoped to the authenticated user's tenant.
    """
    return ChatService(db).list_conversation(current_user.tenant_id, cid, limit=limit)