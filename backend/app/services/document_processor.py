import os
import uuid
import logging
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import asyncio

logger = logging.getLogger(__name__)


class DocumentProcessor:
    """Handles PDF/DOCX parsing, text extraction, and chunking."""

    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    async def process_file(self, file_path: str) -> Dict:
        """Main entry point: parse file and return chunks with metadata."""
        ext = Path(file_path).suffix.lower()
        loop = asyncio.get_event_loop()

        if ext == ".pdf":
            text, pages = await loop.run_in_executor(None, self._parse_pdf, file_path)
        elif ext == ".docx":
            text, pages = await loop.run_in_executor(None, self._parse_docx, file_path)
        elif ext == ".txt":
            text, pages = await loop.run_in_executor(None, self._parse_txt, file_path)
        else:
            raise ValueError(f"Unsupported file type: {ext}")

        chunks = self._chunk_text_with_metadata(text, pages)
        word_count = len(text.split())
        page_count = len(pages)

        return {
            "full_text": text,
            "chunks": chunks,
            "page_count": page_count,
            "word_count": word_count,
        }

    def _parse_pdf(self, file_path: str) -> Tuple[str, List[Dict]]:
        try:
            import pdfplumber
            pages = []
            full_text = ""
            with pdfplumber.open(file_path) as pdf:
                for i, page in enumerate(pdf.pages):
                    text = page.extract_text() or ""
                    pages.append({"page_num": i + 1, "text": text})
                    full_text += f"\n[PAGE {i+1}]\n{text}"
            return full_text, pages
        except Exception as e:
            logger.warning(f"pdfplumber failed, trying PyPDF2: {e}")
            return self._parse_pdf_fallback(file_path)

    def _parse_pdf_fallback(self, file_path: str) -> Tuple[str, List[Dict]]:
        import PyPDF2
        pages = []
        full_text = ""
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for i, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                pages.append({"page_num": i + 1, "text": text})
                full_text += f"\n[PAGE {i+1}]\n{text}"
        return full_text, pages

    def _parse_docx(self, file_path: str) -> Tuple[str, List[Dict]]:
        from docx import Document
        doc = Document(file_path)
        full_text = ""
        pages = [{"page_num": 1, "text": ""}]
        for para in doc.paragraphs:
            full_text += para.text + "\n"
            pages[0]["text"] += para.text + "\n"
        return full_text, pages

    def _parse_txt(self, file_path: str) -> Tuple[str, List[Dict]]:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
        return text, [{"page_num": 1, "text": text}]

    def _chunk_text_with_metadata(self, text: str, pages: List[Dict]) -> List[Dict]:
        """Split text into overlapping chunks, preserving page metadata."""
        chunks = []
        words = text.split()
        chunk_words = self.chunk_size // 5  # ~5 chars per word average
        overlap_words = self.chunk_overlap // 5

        for i in range(0, len(words), chunk_words - overlap_words):
            chunk_text = " ".join(words[i : i + chunk_words])
            if not chunk_text.strip():
                continue

            # Find approximate page number
            page_num = self._find_page_for_chunk(chunk_text, pages)
            clause_type = self._classify_clause(chunk_text)

            chunks.append({
                "chunk_id": str(uuid.uuid4()),
                "text": chunk_text,
                "page_number": page_num,
                "clause_type": clause_type,
                "char_start": i * 5,
                "chunk_index": len(chunks),
            })

        return chunks

    def _find_page_for_chunk(self, chunk_text: str, pages: List[Dict]) -> int:
        """Approximate which page a chunk belongs to."""
        chunk_words = set(chunk_text.lower().split()[:20])
        best_page = 1
        best_overlap = 0
        for page in pages:
            page_words = set(page["text"].lower().split())
            overlap = len(chunk_words & page_words)
            if overlap > best_overlap:
                best_overlap = overlap
                best_page = page["page_num"]
        return best_page

    def _classify_clause(self, text: str) -> Optional[str]:
        """Heuristic clause classification based on keywords."""
        text_lower = text.lower()
        clause_keywords = {
            "payment": ["payment", "invoice", "fee", "compensation", "salary", "remuneration", "billing"],
            "termination": ["termination", "terminate", "cancellation", "end of agreement", "expiry"],
            "confidentiality": ["confidential", "non-disclosure", "nda", "proprietary", "trade secret"],
            "liability": ["liability", "indemnify", "indemnification", "damages", "limitation of liability"],
            "renewal": ["renewal", "auto-renew", "automatically renew", "evergreen", "rollover"],
            "intellectual_property": ["intellectual property", "copyright", "patent", "trademark", "ip rights"],
            "dispute_resolution": ["arbitration", "dispute", "mediation", "jurisdiction", "governing law"],
            "warranty": ["warranty", "guarantee", "representation", "warrants"],
            "force_majeure": ["force majeure", "act of god", "unforeseen circumstances"],
        }
        for clause_type, keywords in clause_keywords.items():
            if any(kw in text_lower for kw in keywords):
                return clause_type
        return "general"
