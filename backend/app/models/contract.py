from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey, Float, func
from app.db.session import Base

class Contract(Base):
    __tablename__ = "contracts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    filename = Column(String(500), nullable=False)
    original_filename = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_size = Column(Integer)
    file_type = Column(String(50))
    contract_type = Column(String(100), nullable=True)
    status = Column(String(50), default="processing")
    page_count = Column(Integer, nullable=True)
    word_count = Column(Integer, nullable=True)
    summary = Column(Text, nullable=True)
    parties = Column(JSON, nullable=True)
    key_dates = Column(JSON, nullable=True)
    risk_score = Column(Float, nullable=True)
    risk_flags = Column(JSON, nullable=True)
    clauses = Column(JSON, nullable=True)
    faiss_index_path = Column(String(1000), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
