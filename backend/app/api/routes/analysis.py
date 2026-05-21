from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.core.security import get_current_user
from app.models.contract import Contract

router = APIRouter()


@router.get("/{contract_id}/summary")
async def get_summary(
    contract_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Contract).where(Contract.id == contract_id, Contract.user_id == current_user.id)
    )
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(404, "Contract not found")
    return {
        "summary": contract.summary,
        "contract_type": contract.contract_type,
        "parties": contract.parties,
        "key_dates": contract.key_dates,
        "word_count": contract.word_count,
        "page_count": contract.page_count,
    }


@router.get("/{contract_id}/risk")
async def get_risk_analysis(
    contract_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Contract).where(Contract.id == contract_id, Contract.user_id == current_user.id)
    )
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(404, "Contract not found")
    return {
        "risk_score": contract.risk_score,
        "risk_flags": contract.risk_flags,
        "contract_id": contract_id,
        "document": contract.original_filename,
    }


@router.get("/{contract_id}/clauses")
async def get_clauses(
    contract_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Contract).where(Contract.id == contract_id, Contract.user_id == current_user.id)
    )
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(404, "Contract not found")
    return {"clauses": contract.clauses, "contract_id": contract_id}
