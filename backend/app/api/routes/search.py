from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.session import get_db
from app.core.security import get_current_user
from app.models.contract import Contract
from app.services.document_service import search_faiss
from app.schemas.contract import SearchRequest

router = APIRouter()


@router.post("/")
async def semantic_search(
    data: SearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query_filter = [Contract.user_id == current_user.id, Contract.status == "ready"]
    if data.contract_ids:
        query_filter.append(Contract.id.in_(data.contract_ids))
    if data.contract_type:
        query_filter.append(Contract.contract_type == data.contract_type)

    result = await db.execute(select(Contract).where(*query_filter))
    contracts = result.scalars().all()

    all_results = []
    for contract in contracts:
        if contract.faiss_index_path:
            try:
                chunks = search_faiss(data.query, contract.faiss_index_path, top_k=3)
                for chunk in chunks:
                    all_results.append({
                        "contract_id": contract.id,
                        "contract_name": contract.original_filename,
                        "contract_type": contract.contract_type,
                        "content": chunk["content"],
                        "page_number": chunk.get("page_number", 1),
                        "relevance_score": chunk.get("relevance_score", 0),
                    })
            except Exception:
                continue

    all_results.sort(key=lambda x: x["relevance_score"], reverse=True)
    return {"query": data.query, "results": all_results[: data.top_k], "total": len(all_results)}
