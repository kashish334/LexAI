import logging
from typing import List, Dict, Optional, AsyncGenerator
from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    """Unified LLM interface supporting Google Gemini and OpenAI."""

    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self._client = None

    def _get_client(self):
        if self._client:
            return self._client

        if self.provider == "google":
            import google.generativeai as genai
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            self._client = genai.GenerativeModel(settings.GEMINI_MODEL)
        elif self.provider == "openai":
            from openai import AsyncOpenAI
            self._client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        return self._client

    async def generate(self, prompt: str, system_prompt: str = "") -> str:
        """Generate a single response."""
        if self.provider == "google":
            return await self._gemini_generate(prompt, system_prompt)
        return await self._openai_generate(prompt, system_prompt)

    async def _gemini_generate(self, prompt: str, system_prompt: str) -> str:
        import google.generativeai as genai
        client = self._get_client()
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        response = client.generate_content(full_prompt)
        return response.text

    async def _openai_generate(self, prompt: str, system_prompt: str) -> str:
        client = self._get_client()
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            max_tokens=2000,
        )
        return response.choices[0].message.content

    async def stream_generate(
        self, prompt: str, system_prompt: str = ""
    ) -> AsyncGenerator[str, None]:
        """Stream tokens as they are generated."""
        if self.provider == "google":
            async for chunk in self._gemini_stream(prompt, system_prompt):
                yield chunk
        else:
            async for chunk in self._openai_stream(prompt, system_prompt):
                yield chunk

    async def _gemini_stream(self, prompt: str, system_prompt: str) -> AsyncGenerator[str, None]:
        import google.generativeai as genai
        client = self._get_client()
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        response = client.generate_content(full_prompt, stream=True)
        for chunk in response:
            if chunk.text:
                yield chunk.text

    async def _openai_stream(self, prompt: str, system_prompt: str) -> AsyncGenerator[str, None]:
        client = self._get_client()
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        stream = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            stream=True,
            max_tokens=2000,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta


class RAGService:
    """Retrieval-Augmented Generation pipeline for legal documents."""

    SYSTEM_PROMPT = """You are LexAI, an expert legal document analyst with deep knowledge of contract law.
Your role is to analyze legal contracts and provide accurate, helpful answers based on the document content.

Guidelines:
- Answer questions based ONLY on the provided document context
- Always cite specific clauses and page numbers when referencing contract text
- Be precise and use legal terminology appropriately
- Flag any ambiguous or potentially risky clauses
- If information is not in the provided context, clearly state that
- Structure your responses clearly with relevant sections
- Never provide general legal advice beyond what's in the document"""

    def __init__(self, llm: LLMService, vector_store):
        self.llm = llm
        self.vector_store = vector_store

    async def answer(
        self,
        query: str,
        contract_ids: List[int],
        conversation_history: List[Dict] = None,
        top_k: int = 5,
    ) -> Dict:
        """Full RAG pipeline: retrieve → augment → generate."""
        import time
        start = time.time()

        # Retrieve relevant chunks
        chunks = await self.vector_store.search(query, contract_ids, top_k=top_k)

        if not chunks:
            return {
                "content": "I couldn't find relevant information in the uploaded documents for your query. Please ensure the documents are processed correctly.",
                "citations": [],
                "tokens_used": 0,
                "response_time_ms": int((time.time() - start) * 1000),
            }

        # Build context from retrieved chunks
        context_parts = []
        for i, chunk in enumerate(chunks):
            context_parts.append(
                f"[SOURCE {i+1}] Document: Contract #{chunk['contract_id']} | "
                f"Page: {chunk.get('page_number', 'N/A')} | "
                f"Clause Type: {chunk.get('clause_type', 'general')}\n"
                f"{chunk['text']}"
            )
        context = "\n\n---\n\n".join(context_parts)

        # Build conversation history context
        history_text = ""
        if conversation_history:
            history_parts = []
            for msg in conversation_history[-6:]:  # Last 3 exchanges
                history_parts.append(f"{msg['role'].upper()}: {msg['content']}")
            history_text = "\nConversation History:\n" + "\n".join(history_parts)

        prompt = f"""Based on the following contract excerpts, answer the user's question accurately.

DOCUMENT CONTEXT:
{context}
{history_text}

USER QUESTION: {query}

Provide a comprehensive answer with specific references to the document sections. Format citations as [SOURCE N]."""

        answer_text = await self.llm.generate(prompt, self.SYSTEM_PROMPT)

        citations = [
            {
                "document_name": f"Contract #{c['contract_id']}",
                "page_number": c.get("page_number"),
                "chunk_text": c["text"][:300] + "..." if len(c["text"]) > 300 else c["text"],
                "relevance_score": round(c["relevance_score"], 4),
                "clause_type": c.get("clause_type"),
                "contract_id": c["contract_id"],
            }
            for c in chunks
        ]

        return {
            "content": answer_text,
            "citations": citations,
            "tokens_used": len(answer_text.split()) * 2,
            "response_time_ms": int((time.time() - start) * 1000),
        }

    async def summarize_contract(self, full_text: str, contract_id: int) -> Dict:
        """Generate structured contract summary."""
        prompt = f"""Analyze this legal contract and provide a structured summary in JSON format.

CONTRACT TEXT (first 8000 chars):
{full_text[:8000]}

Return a JSON object with these fields:
{{
  "executive_summary": "2-3 sentence overview",
  "parties_involved": ["Party 1", "Party 2"],
  "contract_type": "Type of contract",
  "key_obligations": ["obligation 1", "obligation 2"],
  "important_dates": [{{"label": "Effective Date", "date": "..."}}, ...],
  "contract_duration": "Duration or term",
  "governing_law": "Jurisdiction",
  "risks": ["risk 1", "risk 2"],
  "payment_terms": "Summary of payment terms if any"
}}

Respond with ONLY the JSON, no markdown or explanation."""

        response = await self.llm.generate(prompt)
        try:
            import json, re
            # Strip markdown code blocks if present
            clean = re.sub(r"```json|```", "", response).strip()
            return json.loads(clean)
        except Exception:
            return {"executive_summary": response, "parties_involved": [], "key_obligations": [], "risks": []}

    async def analyze_risk(self, full_text: str, chunks: List[Dict]) -> Dict:
        """Detect legal risk patterns in the contract."""
        sample_text = full_text[:10000]
        prompt = f"""You are an expert legal risk analyst. Analyze this contract for legal risks.

CONTRACT TEXT:
{sample_text}

Identify ALL risk patterns including:
1. Unlimited liability clauses
2. Missing or unclear termination conditions
3. Auto-renewal traps
4. One-sided obligations
5. Ambiguous language
6. Missing dispute resolution
7. Unfavorable IP assignments
8. Broad indemnification
9. No limitation of liability cap
10. Vague payment terms

Return a JSON object:
{{
  "overall_risk_score": <0.0-10.0>,
  "risk_level": "Low|Medium|High|Critical",
  "risk_flags": [
    {{
      "category": "Category name",
      "severity": "low|medium|high|critical",
      "description": "What the risk is",
      "clause_text": "Relevant contract text (max 200 chars)",
      "page_number": null,
      "recommendation": "How to mitigate"
    }}
  ],
  "recommendations": ["General recommendation 1", "..."]
}}

Respond with ONLY the JSON."""

        response = await self.llm.generate(prompt)
        try:
            import json, re
            clean = re.sub(r"```json|```", "", response).strip()
            return json.loads(clean)
        except Exception:
            return {
                "overall_risk_score": 5.0,
                "risk_level": "Medium",
                "risk_flags": [],
                "recommendations": ["Manual review recommended"],
            }

    async def extract_clauses(self, full_text: str) -> Dict:
        """Extract and categorize key clauses from the contract."""
        prompt = f"""Extract and categorize key clauses from this legal contract.

CONTRACT TEXT (first 6000 chars):
{full_text[:6000]}

Return a JSON object with clause categories as keys:
{{
  "payment": [{{"content": "...", "page_number": null, "importance": "high"}}],
  "termination": [...],
  "confidentiality": [...],
  "liability": [...],
  "renewal": [...],
  "intellectual_property": [...],
  "dispute_resolution": [...],
  "warranty": [...]
}}

Each clause object has: content (the clause text), page_number (null if unknown), importance (low/medium/high).
Respond with ONLY the JSON."""

        response = await self.llm.generate(prompt)
        try:
            import json, re
            clean = re.sub(r"```json|```", "", response).strip()
            return json.loads(clean)
        except Exception:
            return {}


llm_service = LLMService()
