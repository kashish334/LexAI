import os
import json
import logging
import asyncio
import numpy as np
from pathlib import Path
from typing import List, Dict, Optional, Tuple

logger = logging.getLogger(__name__)


class VectorStoreService:
    """Manages FAISS vector indexes per contract."""

    def __init__(self, index_dir: str, embedding_model: str = "all-MiniLM-L6-v2"):
        self.index_dir = Path(index_dir)
        self.index_dir.mkdir(parents=True, exist_ok=True)
        self.embedding_model_name = embedding_model
        self._model = None
        self._indexes: Dict[int, dict] = {}  # contract_id -> {index, chunks}

    def _get_model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading embedding model: {self.embedding_model_name}")
            self._model = SentenceTransformer(self.embedding_model_name)
        return self._model

    def _embed(self, texts: List[str]) -> np.ndarray:
        model = self._get_model()
        return model.encode(texts, show_progress_bar=False, normalize_embeddings=True)

    async def index_contract(self, contract_id: int, chunks: List[Dict]) -> str:
        """Create and persist FAISS index for a contract."""
        loop = asyncio.get_event_loop()
        index_path = await loop.run_in_executor(
            None, self._index_contract_sync, contract_id, chunks
        )
        return index_path

    def _index_contract_sync(self, contract_id: int, chunks: List[Dict]) -> str:
        import faiss

        texts = [c["text"] for c in chunks]
        embeddings = self._embed(texts)

        dim = embeddings.shape[1]
        index = faiss.IndexFlatIP(dim)  # Inner product (cosine on normalized vecs)
        index.add(embeddings.astype(np.float32))

        index_path = self.index_dir / str(contract_id)
        index_path.mkdir(parents=True, exist_ok=True)

        faiss.write_index(index, str(index_path / "index.faiss"))
        with open(index_path / "chunks.json", "w") as f:
            json.dump(chunks, f)

        self._indexes[contract_id] = {"index": index, "chunks": chunks}
        logger.info(f"Indexed {len(chunks)} chunks for contract {contract_id}")
        return str(index_path)

    def _load_index(self, contract_id: int) -> Optional[Dict]:
        if contract_id in self._indexes:
            return self._indexes[contract_id]

        import faiss
        index_path = self.index_dir / str(contract_id)
        if not index_path.exists():
            return None

        index = faiss.read_index(str(index_path / "index.faiss"))
        with open(index_path / "chunks.json") as f:
            chunks = json.load(f)

        self._indexes[contract_id] = {"index": index, "chunks": chunks}
        return self._indexes[contract_id]

    async def search(
        self,
        query: str,
        contract_ids: List[int],
        top_k: int = 5,
    ) -> List[Dict]:
        """Semantic search across one or more contracts."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, self._search_sync, query, contract_ids, top_k
        )

    def _search_sync(self, query: str, contract_ids: List[int], top_k: int) -> List[Dict]:
        query_embedding = self._embed([query]).astype(np.float32)
        all_results = []

        for contract_id in contract_ids:
            store = self._load_index(contract_id)
            if not store:
                logger.warning(f"No index found for contract {contract_id}")
                continue

            index = store["index"]
            chunks = store["chunks"]

            k = min(top_k, index.ntotal)
            if k == 0:
                continue

            scores, indices = index.search(query_embedding, k)

            for score, idx in zip(scores[0], indices[0]):
                if idx < 0:
                    continue
                chunk = chunks[idx].copy()
                chunk["relevance_score"] = float(score)
                chunk["contract_id"] = contract_id
                all_results.append(chunk)

        all_results.sort(key=lambda x: x["relevance_score"], reverse=True)
        return all_results[:top_k]

    async def delete_index(self, contract_id: int):
        """Remove FAISS index for a deleted contract."""
        import shutil
        index_path = self.index_dir / str(contract_id)
        if index_path.exists():
            shutil.rmtree(index_path)
        self._indexes.pop(contract_id, None)


vector_store = VectorStoreService(
    index_dir=os.getenv("FAISS_INDEX_DIR", "./faiss_indexes"),
    embedding_model=os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2"),
)
