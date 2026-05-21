from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class ContractResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_size: Optional[int]
    file_type: Optional[str]
    contract_type: Optional[str]
    status: str
    page_count: Optional[int]
    word_count: Optional[int]
    summary: Optional[str]
    parties: Optional[Any]
    key_dates: Optional[Any]
    risk_score: Optional[float]
    risk_flags: Optional[Any]
    clauses: Optional[Any]
    created_at: datetime

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[int] = None
    contract_id: Optional[int] = None


class SearchRequest(BaseModel):
    query: str
    contract_ids: Optional[List[int]] = None
    contract_type: Optional[str] = None
    top_k: int = 10
