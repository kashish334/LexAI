import time
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json

from app.db.session import get_db
from app.core.security import get_current_user
from app.models.contract import Contract
from app.models.chat import ChatSession, ChatMessage
from app.models.analytics import QueryAnalytics
from app.services.document_service import search_faiss
from app.services.ai_service import generate_answer, stream_answer
from app.schemas.contract import ChatRequest

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/")
async def chat(
    data: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    start_time = time.time()

    # Get or create session
    if data.session_id:
        sess_result = await db.execute(
            select(ChatSession).where(
                ChatSession.id == data.session_id, ChatSession.user_id == current_user.id
            )
        )
        session = sess_result.scalar_one_or_none()
        if not session:
            raise HTTPException(404, "Session not found")
    else:
        session = ChatSession(
            user_id=current_user.id,
            contract_id=data.contract_id,
            title=data.message[:60] + "..." if len(data.message) > 60 else data.message,
        )
        db.add(session)
        await db.flush()
        await db.refresh(session)

    # Get contract
    contract = None
    context_chunks = []
    if data.contract_id or session.contract_id:
        cid = data.contract_id or session.contract_id
        result = await db.execute(
            select(Contract).where(Contract.id == cid, Contract.user_id == current_user.id)
        )
        contract = result.scalar_one_or_none()
        if contract and contract.faiss_index_path and contract.status == "ready":
            context_chunks = search_faiss(data.message, contract.faiss_index_path, top_k=5)

    # Get conversation history
    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(10)
    )
    history = [
        {"role": m.role, "content": m.content}
        for m in reversed(history_result.scalars().all())
    ]

    # Save user message
    user_msg = ChatMessage(session_id=session.id, role="user", content=data.message)
    db.add(user_msg)

    # Generate answer
    doc_name = contract.original_filename if contract else "general query"
    ai_result = await generate_answer(data.message, context_chunks, doc_name, history)

    # Save assistant message
    asst_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=ai_result["answer"],
        citations=ai_result["citations"],
        tokens_used=ai_result.get("tokens_used"),
    )
    db.add(asst_msg)

    # Log analytics
    elapsed_ms = int((time.time() - start_time) * 1000)
    analytics = QueryAnalytics(
        user_id=current_user.id,
        contract_id=data.contract_id,
        query=data.message,
        response_time_ms=elapsed_ms,
        tokens_used=ai_result.get("tokens_used"),
    )
    db.add(analytics)

    return {
        "session_id": session.id,
        "message_id": asst_msg.id,
        "answer": ai_result["answer"],
        "citations": ai_result["citations"],
        "tokens_used": ai_result.get("tokens_used"),
        "response_time_ms": elapsed_ms,
    }


@router.get("/sessions")
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
        .limit(50)
    )
    sessions = result.scalars().all()
    return [{"id": s.id, "title": s.title, "contract_id": s.contract_id, "created_at": str(s.created_at)} for s in sessions]


@router.get("/sessions/{session_id}/messages")
async def get_messages(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    sess_result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    session = sess_result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = result.scalars().all()
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "citations": m.citations,
            "created_at": str(m.created_at),
        }
        for m in messages
    ]
