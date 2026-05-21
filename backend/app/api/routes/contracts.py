import os
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.session import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.contract import Contract
from app.services.document_service import process_document_async
from app.services.ai_service import analyze_contract
from app.schemas.contract import ContractResponse

router = APIRouter()
logger = logging.getLogger(__name__)

ALLOWED_TYPES = {"pdf", "docx", "doc", "txt"}


async def process_contract_bg(contract_id: int, file_path: str, file_type: str, db_url: str):
    """Background task: parse, embed, analyze contract."""
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy import update
    from app.models.contract import Contract

    engine = create_async_engine(db_url)
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with SessionLocal() as db:
        try:
            result = await process_document_async(
                file_path, file_type, contract_id, settings.FAISS_INDEX_DIR
            )
            analysis = await analyze_contract(result["text"], os.path.basename(file_path))

            await db.execute(
                update(Contract).where(Contract.id == contract_id).values(
                    status="ready",
                    page_count=result["page_count"],
                    word_count=result["word_count"],
                    faiss_index_path=result["faiss_index_path"],
                    summary=analysis.get("executive_summary"),
                    parties=analysis.get("parties"),
                    key_dates=analysis.get("key_dates"),
                    risk_score=analysis.get("risk_score"),
                    risk_flags=analysis.get("risk_flags"),
                    contract_type=analysis.get("contract_type"),
                    clauses={
                        "payment": analysis.get("payment_clauses", []),
                        "termination": analysis.get("termination_clauses", []),
                        "liability": analysis.get("liability_clauses", []),
                        "confidentiality": analysis.get("confidentiality_clauses", []),
                        "renewal": analysis.get("renewal_clauses", []),
                        "key_obligations": analysis.get("key_obligations", []),
                    },
                )
            )
            await db.commit()
            logger.info(f"Contract {contract_id} processed successfully")
        except Exception as e:
            logger.error(f"Contract {contract_id} processing failed: {e}")
            await db.execute(
                update(Contract).where(Contract.id == contract_id).values(status="error")
            )
            await db.commit()
    await engine.dispose()


@router.post("/upload", response_model=ContractResponse, status_code=201)
async def upload_contract(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ext = file.filename.split(".")[-1].lower()
    if ext not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported file type. Allowed: {ALLOWED_TYPES}")

    file_size = 0
    safe_name = f"{uuid.uuid4()}.{ext}"
    user_dir = os.path.join(settings.UPLOAD_DIR, str(current_user.id))
    os.makedirs(user_dir, exist_ok=True)
    file_path = os.path.join(user_dir, safe_name)

    with open(file_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            file_size += len(chunk)
            if file_size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
                os.unlink(file_path)
                raise HTTPException(413, f"File too large. Max {settings.MAX_FILE_SIZE_MB}MB")
            f.write(chunk)

    contract = Contract(
        user_id=current_user.id,
        filename=safe_name,
        original_filename=file.filename,
        file_path=file_path,
        file_size=file_size,
        file_type=ext,
        status="processing",
    )
    db.add(contract)
    await db.flush()
    await db.refresh(contract)

    background_tasks.add_task(
        process_contract_bg, contract.id, file_path, ext, settings.DATABASE_URL
    )

    return contract


@router.get("/", response_model=List[ContractResponse])
async def list_contracts(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Contract)
        .where(Contract.user_id == current_user.id)
        .order_by(Contract.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{contract_id}", response_model=ContractResponse)
async def get_contract(
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
    return contract


@router.delete("/{contract_id}", status_code=204)
async def delete_contract(
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

    if os.path.exists(contract.file_path):
        os.unlink(contract.file_path)

    await db.delete(contract)
