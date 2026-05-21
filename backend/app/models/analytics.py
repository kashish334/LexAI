from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, func
from app.db.session import Base

class QueryAnalytics(Base):
    __tablename__ = "query_analytics"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=True)
    query = Column(String(2000), nullable=False)
    response_time_ms = Column(Integer, nullable=True)
    tokens_used = Column(Integer, nullable=True)
    clause_types_queried = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
