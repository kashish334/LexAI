from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Dict, Any
from datetime import datetime


# ── Auth Schemas ──────────────────────────────────────────────
class UserRegister(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    password: str

    @validator("password")
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @validator("username")
    def username_alphanumeric(cls, v):
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username must be alphanumeric")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str]
    is_active: bool
    is_admin: bool
    avatar_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Contract Schemas ──────────────────────────────────────────
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
    risk_score: Optional[float]
    risk_flags: Optional[List[Dict]]
    summary: Optional[str]
    parties_involved: Optional[List[str]]
    key_dates: Optional[List[Dict]]
    created_at: datetime
    processed_at: Optional[datetime]

    class Config:
        from_attributes = True


class ContractListResponse(BaseModel):
    contracts: List[ContractResponse]
    total: int
    page: int
    page_size: int


# ── Chat Schemas ──────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    contract_id: Optional[int] = None
    session_id: Optional[int] = None
    stream: bool = False


class Citation(BaseModel):
    document_name: str
    page_number: Optional[int]
    chunk_text: str
    relevance_score: float
    clause_type: Optional[str]


class ChatResponse(BaseModel):
    session_id: int
    message_id: int
    content: str
    citations: List[Citation]
    tokens_used: Optional[int]
    response_time_ms: Optional[float]


class ChatSessionResponse(BaseModel):
    id: int
    title: Optional[str]
    contract_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]
    message_count: Optional[int] = 0

    class Config:
        from_attributes = True


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    citations: Optional[List[Citation]]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Analysis Schemas ──────────────────────────────────────────
class RiskFlag(BaseModel):
    category: str
    severity: str  # low / medium / high / critical
    description: str
    clause_text: str
    page_number: Optional[int]
    recommendation: str


class ClauseExtraction(BaseModel):
    clause_type: str
    content: str
    page_number: Optional[int]
    importance: str  # low / medium / high


class ContractSummary(BaseModel):
    executive_summary: str
    parties_involved: List[str]
    key_obligations: List[str]
    important_dates: List[Dict[str, str]]
    contract_duration: Optional[str]
    governing_law: Optional[str]
    risks: List[str]


class RiskAnalysisResponse(BaseModel):
    contract_id: int
    overall_risk_score: float
    risk_level: str  # Low / Medium / High / Critical
    risk_flags: List[RiskFlag]
    recommendations: List[str]


class ClauseExtractionResponse(BaseModel):
    contract_id: int
    clauses: Dict[str, List[ClauseExtraction]]


# ── Search Schemas ──────────────────────────────────────────────
class SearchRequest(BaseModel):
    query: str
    contract_ids: Optional[List[int]] = None
    contract_type: Optional[str] = None
    top_k: int = 10


class SearchResult(BaseModel):
    contract_id: int
    contract_name: str
    chunk_text: str
    page_number: Optional[int]
    relevance_score: float
    clause_type: Optional[str]


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    total: int


# ── Admin Schemas ──────────────────────────────────────────────
class AdminStats(BaseModel):
    total_users: int
    total_contracts: int
    total_queries: int
    avg_risk_score: float
    contracts_by_type: Dict[str, int]
    queries_per_day: List[Dict]
    top_clause_types: List[Dict]
    recent_activity: List[Dict]


TokenResponse.model_rebuild()
