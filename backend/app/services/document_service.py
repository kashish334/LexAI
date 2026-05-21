"""Document parsing, chunking, and FAISS indexing service."""

import os
import uuid
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import asyncio

logger = logging.getLogger(__name__)


def parse_pdf(file_path: str) -> Tuple[str, int]:
    """Extract text from PDF using PyMuPDF (fitz) with OCR fallback."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(file_path)
        text_parts = []
        for page_num, page in enumerate(doc):
            text = page.get_text("text")
            if not text.strip() and len(text) < 50:
                # Try OCR for scanned pages
                text = page.get_text("rawdict").get("blocks", "")
            text_parts.append(f"[PAGE {page_num + 1}]\n{text}")
        page_count = len(doc)
        doc.close()
        return "\n\n".join(text_parts), page_count
    except Exception as e:
        logger.error(f"PDF parse error: {e}")
        raise


def parse_docx(file_path: str) -> Tuple[str, int]:
    """Extract text from DOCX."""
    from docx import Document
    doc = Document(file_path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs), 1


def parse_document(file_path: str, file_type: str) -> Tuple[str, int]:
    """Parse document based on type."""
    if file_type in ["pdf"]:
        return parse_pdf(file_path)
    elif file_type in ["docx", "doc"]:
        return parse_docx(file_path)
    elif file_type == "txt":
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        return content, 1
    else:
        raise ValueError(f"Unsupported file type: {file_type}")


def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[Dict[str, Any]]:
    """Split text into overlapping chunks with metadata."""
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
        length_function=len,
    )
    chunks = splitter.split_text(text)
    result = []
    for i, chunk in enumerate(chunks):
        # Try to detect page number from chunk
        page_num = 1
        for line in chunk.split("\n"):
            if line.strip().startswith("[PAGE "):
                try:
                    page_num = int(line.strip()[6:-1])
                except:
                    pass
                break
        result.append({
            "chunk_id": i,
            "content": chunk,
            "page_number": page_num,
            "char_start": text.find(chunk[:50]) if chunk else 0,
        })
    return result


def build_faiss_index(chunks: List[Dict], index_path: str) -> None:
    """Build and save FAISS vector index."""
    import faiss
    import numpy as np
    from sentence_transformers import SentenceTransformer
    from app.core.config import settings

    model = SentenceTransformer(settings.EMBEDDING_MODEL)
    texts = [c["content"] for c in chunks]
    embeddings = model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
    embeddings = embeddings.astype(np.float32)

    # Normalize for cosine similarity
    faiss.normalize_L2(embeddings)

    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)  # Inner product (cosine after normalization)
    index.add(embeddings)

    os.makedirs(index_path, exist_ok=True)
    faiss.write_index(index, os.path.join(index_path, "index.faiss"))

    import json
    with open(os.path.join(index_path, "chunks.json"), "w") as f:
        json.dump(chunks, f, ensure_ascii=False)

    logger.info(f"FAISS index built: {len(chunks)} chunks at {index_path}")


def search_faiss(query: str, index_path: str, top_k: int = 5) -> List[Dict]:
    """Search FAISS index for relevant chunks."""
    import faiss
    import numpy as np
    import json
    from sentence_transformers import SentenceTransformer
    from app.core.config import settings

    with open(os.path.join(index_path, "chunks.json"), "r") as f:
        chunks = json.load(f)

    model = SentenceTransformer(settings.EMBEDDING_MODEL)
    query_embedding = model.encode([query], convert_to_numpy=True).astype(np.float32)
    faiss.normalize_L2(query_embedding)

    index = faiss.read_index(os.path.join(index_path, "index.faiss"))
    scores, indices = index.search(query_embedding, min(top_k, len(chunks)))

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < len(chunks) and idx >= 0:
            chunk = chunks[idx].copy()
            chunk["relevance_score"] = float(score)
            results.append(chunk)
    return results


async def process_document_async(
    file_path: str,
    file_type: str,
    contract_id: int,
    faiss_index_dir: str,
) -> Dict[str, Any]:
    """Full async pipeline: parse → chunk → index."""
    loop = asyncio.get_event_loop()

    # Run CPU-intensive work in executor
    text, page_count = await loop.run_in_executor(None, parse_document, file_path, file_type)
    word_count = len(text.split())

    from app.core.config import settings
    chunks = await loop.run_in_executor(
        None, chunk_text, text, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP
    )

    index_path = os.path.join(faiss_index_dir, f"contract_{contract_id}")
    await loop.run_in_executor(None, build_faiss_index, chunks, index_path)

    return {
        "text": text,
        "page_count": page_count,
        "word_count": word_count,
        "chunk_count": len(chunks),
        "faiss_index_path": index_path,
    }
