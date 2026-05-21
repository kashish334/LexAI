"""AI service - RAG pipeline with Google Gemini / OpenAI."""

import logging
from typing import List, Dict, Any, AsyncGenerator
from app.core.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are LexAI, an expert legal document analyst. Your role is to:
1. Answer questions about legal contracts accurately and clearly
2. Always cite specific clauses with page numbers when referencing contract text
3. Highlight potential legal risks when relevant
4. Use plain language to explain complex legal terms
5. Be precise and conservative - never speculate beyond what the document states

When citing, format as: [Source: Document Name, Page X, Clause: "...excerpt..."]

Always structure your response:
- Direct answer to the question
- Supporting evidence from the contract
- Any relevant caveats or risks
"""


def get_ai_client():
    if settings.AI_PROVIDER == "google":
        import google.generativeai as genai
        genai.configure(api_key=settings.GOOGLE_API_KEY)
        return genai.GenerativeModel("gemini-1.5-pro")
    else:
        from openai import AsyncOpenAI
        return AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def generate_answer(
    query: str,
    context_chunks: List[Dict],
    document_name: str,
    conversation_history: List[Dict] = None,
) -> Dict[str, Any]:
    """Generate RAG answer with citations."""

    # Build context string
    context_parts = []
    for chunk in context_chunks:
        context_parts.append(
            f"[Page {chunk.get('page_number', '?')}, Chunk {chunk.get('chunk_id', '?')}]\n"
            f"{chunk['content']}\n"
            f"(Relevance: {chunk.get('relevance_score', 0):.2f})"
        )
    context = "\n\n---\n\n".join(context_parts)

    prompt = f"""Document: {document_name}

Relevant Contract Sections:
{context}

User Question: {query}

Based ONLY on the contract sections provided above, answer the question. Include specific citations."""

    citations = []
    for chunk in context_chunks:
        if chunk.get("relevance_score", 0) > 0.5:
            citations.append({
                "document": document_name,
                "page": chunk.get("page_number", 1),
                "chunk_id": chunk.get("chunk_id"),
                "excerpt": chunk["content"][:200] + "..." if len(chunk["content"]) > 200 else chunk["content"],
                "relevance": chunk.get("relevance_score", 0),
            })

    try:
        if settings.AI_PROVIDER == "google":
            import google.generativeai as genai
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            model = genai.GenerativeModel(
                "gemini-1.5-pro",
                system_instruction=SYSTEM_PROMPT,
            )
            response = model.generate_content(prompt)
            answer = response.text
            tokens = getattr(response.usage_metadata, "total_token_count", 0)
        else:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]
            if conversation_history:
                messages.extend(conversation_history[-6:])
            messages.append({"role": "user", "content": prompt})
            resp = await client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                max_tokens=2000,
            )
            answer = resp.choices[0].message.content
            tokens = resp.usage.total_tokens

        return {"answer": answer, "citations": citations, "tokens_used": tokens}

    except Exception as e:
        logger.error(f"AI generation error: {e}")
        # Fallback: Use Anthropic API via the artifact pattern
        raise


async def stream_answer(
    query: str,
    context_chunks: List[Dict],
    document_name: str,
) -> AsyncGenerator[str, None]:
    """Stream AI response for real-time UX."""
    context_parts = [
        f"[Page {c.get('page_number', '?')}]\n{c['content']}"
        for c in context_chunks
    ]
    context = "\n\n---\n\n".join(context_parts)
    prompt = f"Document: {document_name}\n\nContext:\n{context}\n\nQuestion: {query}"

    try:
        if settings.AI_PROVIDER == "google":
            import google.generativeai as genai
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            model = genai.GenerativeModel("gemini-1.5-pro", system_instruction=SYSTEM_PROMPT)
            response = model.generate_content(prompt, stream=True)
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        else:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            async with client.chat.completions.stream(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
            ) as stream:
                async for chunk in stream:
                    delta = chunk.choices[0].delta.content
                    if delta:
                        yield delta
    except Exception as e:
        logger.error(f"Streaming error: {e}")
        yield f"Error generating response: {str(e)}"


async def analyze_contract(text: str, document_name: str) -> Dict[str, Any]:
    """Full contract analysis: summary, parties, dates, risks, clauses."""

    analysis_prompt = f"""Analyze this legal contract and return a JSON object with:
{{
  "executive_summary": "2-3 sentence overview",
  "contract_type": "e.g. Employment, NDA, Service Agreement, Lease",
  "parties": [
    {{"name": "Party Name", "role": "e.g. Employer/Employee/Vendor/Client"}}
  ],
  "key_dates": [
    {{"date": "YYYY-MM-DD or description", "event": "what happens on this date"}}
  ],
  "key_obligations": [
    {{"party": "who", "obligation": "what they must do"}}
  ],
  "payment_clauses": ["list of payment terms"],
  "termination_clauses": ["termination conditions"],
  "liability_clauses": ["liability terms"],
  "confidentiality_clauses": ["NDA/confidentiality terms"],
  "renewal_clauses": ["auto-renewal or renewal terms"],
  "risk_score": 0-100,
  "risk_flags": [
    {{"severity": "high/medium/low", "type": "risk category", "description": "what the risk is", "clause": "relevant text"}}
  ],
  "risks_summary": "overall risk assessment"
}}

Contract text (first 8000 chars):
{text[:8000]}

Return ONLY valid JSON, no markdown."""

    try:
        if settings.AI_PROVIDER == "google":
            import google.generativeai as genai
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            model = genai.GenerativeModel("gemini-1.5-pro")
            response = model.generate_content(analysis_prompt)
            raw = response.text
        else:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            resp = await client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": analysis_prompt}],
                response_format={"type": "json_object"},
            )
            raw = resp.choices[0].message.content

        import json
        # Clean up markdown if present
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw)

    except Exception as e:
        logger.error(f"Contract analysis error: {e}")
        return {
            "executive_summary": "Analysis unavailable",
            "contract_type": "Unknown",
            "parties": [],
            "key_dates": [],
            "key_obligations": [],
            "payment_clauses": [],
            "termination_clauses": [],
            "liability_clauses": [],
            "confidentiality_clauses": [],
            "renewal_clauses": [],
            "risk_score": 50,
            "risk_flags": [],
            "risks_summary": "Unable to analyze",
        }
