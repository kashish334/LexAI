from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.core.security import get_current_admin
from app.models.user import User
from app.models.contract import Contract
from app.models.analytics import QueryAnalytics

router = APIRouter()


@router.get("/stats")
async def admin_stats(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    user_count = await db.scalar(select(func.count(User.id)))
    contract_count = await db.scalar(select(func.count(Contract.id)))
    query_count = await db.scalar(select(func.count(QueryAnalytics.id)))
    avg_risk = await db.scalar(select(func.avg(Contract.risk_score)).where(Contract.risk_score.isnot(None)))
    high_risk = await db.scalar(select(func.count(Contract.id)).where(Contract.risk_score >= 70))

    return {
        "total_users": user_count,
        "total_contracts": contract_count,
        "total_queries": query_count,
        "avg_risk_score": round(avg_risk or 0, 1),
        "high_risk_contracts": high_risk,
    }


@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    result = await db.execute(select(User).order_by(User.created_at.desc()).limit(100))
    users = result.scalars().all()
    return [{"id": u.id, "email": u.email, "full_name": u.full_name, "is_admin": u.is_admin, "created_at": str(u.created_at)} for u in users]
