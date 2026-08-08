"""FAISS and LangChain retrieval service.

This service retrieves knowledge contexts only. It does not generate reports,
summaries, recommendations, or Granite completions.
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
from pathlib import Path
from typing import Any

import faiss
import numpy as np
from langchain_core.documents import Document

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:  # pragma: no cover - compatibility for older LangChain bundles
    RecursiveCharacterTextSplitter = None  # type: ignore[assignment]

from app.schemas.rag import (
    KnowledgeDocumentInput,
    KnowledgeSourceType,
    RagIndexRequest,
    RagIndexResponse,
    RagRetrievalRequest,
    RagRetrievalResponse,
    RetrievedContext,
)
from app.services.rag.document_loader import KnowledgeDocumentLoader


class GraniteEmbeddingProvider:
    """IBM Granite embedding adapter, used only when watsonx settings exist."""

    def __init__(self) -> None:
        self.model_id = os.getenv("GRANITE_EMBEDDING_MODEL_ID", "ibm/slate-125m-english-rtrvr")
        self.project_id = os.getenv("WATSONX_PROJECT_ID")
        self.api_key = os.getenv("WATSONX_API_KEY")
        self.url = os.getenv("WATSONX_URL")
        if not all([self.project_id, self.api_key, self.url]):
            msg = "watsonx credentials are not configured"
            raise RuntimeError(msg)

        from ibm_watsonx_ai import Credentials
        from ibm_watsonx_ai.foundation_models.embeddings import Embeddings

        credentials = Credentials(url=self.url, api_key=self.api_key)
        self.client = Embeddings(
            model_id=self.model_id,
            credentials=credentials,
            project_id=self.project_id,
        )

    @property
    def name(self) -> str:
        return f"ibm_granite:{self.model_id}"

    def embed_documents(self, texts: list[str]) -> np.ndarray:
        vectors = self.client.embed_documents(texts=texts)
        return np.array(vectors, dtype=np.float32)

    def embed_query(self, text: str) -> np.ndarray:
        vector = self.client.embed_query(text=text)
        return np.array([vector], dtype=np.float32)


class HashEmbeddingProvider:
    """Deterministic local embedding fallback for offline retrieval demos."""

    dimensions = 384

    @property
    def name(self) -> str:
        return "local_hash_embedding"

    def embed_documents(self, texts: list[str]) -> np.ndarray:
        return np.vstack([self._embed(text) for text in texts]).astype(np.float32)

    def embed_query(self, text: str) -> np.ndarray:
        return np.array([self._embed(text)], dtype=np.float32)

    def _embed(self, text: str) -> np.ndarray:
        vector = np.zeros(self.dimensions, dtype=np.float32)
        for token in text.lower().split():
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], byteorder="big") % self.dimensions
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[index] += sign
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm
        return vector


class RagRetrievalService:
    """Build and query a FAISS-backed knowledge retrieval index."""

    def __init__(
        self,
        index_root: Path | None = None,
        embedding_provider: GraniteEmbeddingProvider | HashEmbeddingProvider | None = None,
    ) -> None:
        self.index_root = (index_root or Path(os.getenv("FAISS_INDEX_PATH", "./data/vector_indexes"))).resolve()
        self.loader = KnowledgeDocumentLoader()
        self.embedding_provider = embedding_provider or self._default_embedding_provider()

    def build_index(self, request: RagIndexRequest) -> RagIndexResponse:
        """Build or update a FAISS index from knowledge documents."""

        index_dir = self._index_dir(request.index_name)
        if request.rebuild and index_dir.exists():
            shutil.rmtree(index_dir)
        index_dir.mkdir(parents=True, exist_ok=True)

        documents = [*request.documents, *self.loader.load_paths(request.source_paths)]
        chunks = self._chunk_documents(documents)
        if not chunks:
            self._write_metadata(index_dir, [], request.index_name)
            return RagIndexResponse(
                index_name=request.index_name,
                indexed_documents=len(documents),
                indexed_chunks=0,
                embedding_provider=self.embedding_provider.name,
                index_path=str(index_dir),
            )

        vectors = self.embedding_provider.embed_documents([chunk.page_content for chunk in chunks])
        index = faiss.IndexFlatIP(vectors.shape[1])
        faiss.normalize_L2(vectors)
        index.add(vectors)

        faiss.write_index(index, str(index_dir / "index.faiss"))
        self._write_metadata(index_dir, chunks, request.index_name)

        return RagIndexResponse(
            index_name=request.index_name,
            indexed_documents=len(documents),
            indexed_chunks=len(chunks),
            embedding_provider=self.embedding_provider.name,
            index_path=str(index_dir),
        )

    def retrieve(self, request: RagRetrievalRequest) -> RagRetrievalResponse:
        """Retrieve relevant contexts from a FAISS index."""

        index_dir = self._index_dir(request.index_name)
        index_path = index_dir / "index.faiss"
        metadata_path = index_dir / "chunks.json"
        if not index_path.exists() or not metadata_path.exists():
            return RagRetrievalResponse(
                query=request.query,
                index_name=request.index_name,
                embedding_provider=self.embedding_provider.name,
                contexts=[],
            )

        index = faiss.read_index(str(index_path))
        chunks = json.loads(metadata_path.read_text(encoding="utf-8"))
        query_vector = self.embedding_provider.embed_query(request.query)
        faiss.normalize_L2(query_vector)
        scores, indexes = index.search(query_vector, request.top_k * 3)

        contexts: list[RetrievedContext] = []
        source_filter = set(request.source_types)
        for score, chunk_index in zip(scores[0], indexes[0], strict=False):
            if chunk_index < 0:
                continue
            chunk = chunks[int(chunk_index)]
            source_type = KnowledgeSourceType(chunk["source_type"])
            if source_filter and source_type not in source_filter:
                continue
            contexts.append(
                RetrievedContext(
                    chunk_id=chunk["chunk_id"],
                    document_id=chunk["document_id"],
                    source_type=source_type,
                    title=chunk["title"],
                    text=chunk["text"],
                    score=round(float(score), 4),
                    source_uri=chunk.get("source_uri"),
                    metadata=chunk.get("metadata", {}),
                )
            )
            if len(contexts) >= request.top_k:
                break

        return RagRetrievalResponse(
            query=request.query,
            index_name=request.index_name,
            embedding_provider=self.embedding_provider.name,
            contexts=contexts,
        )

    def _chunk_documents(self, documents: list[KnowledgeDocumentInput]) -> list[Document]:
        langchain_documents = [
            Document(
                page_content=document.text,
                metadata={
                    "document_id": document.document_id,
                    "source_type": document.source_type.value,
                    "title": document.title,
                    "source_uri": document.source_uri,
                    "published_at": document.published_at,
                    "jurisdiction": document.jurisdiction,
                    "tags": ",".join(document.tags),
                },
            )
            for document in documents
            if document.text.strip()
        ]
        if RecursiveCharacterTextSplitter is None:
            return self._simple_chunks(langchain_documents)

        splitter = RecursiveCharacterTextSplitter(chunk_size=900, chunk_overlap=120)
        return splitter.split_documents(langchain_documents)

    @staticmethod
    def _simple_chunks(documents: list[Document]) -> list[Document]:
        chunks: list[Document] = []
        for document in documents:
            text = document.page_content
            for start in range(0, len(text), 780):
                chunk_text = text[start : start + 900]
                if chunk_text.strip():
                    chunks.append(Document(page_content=chunk_text, metadata=document.metadata))
        return chunks

    def _write_metadata(self, index_dir: Path, chunks: list[Document], index_name: str) -> None:
        payload: list[dict[str, Any]] = []
        for index, chunk in enumerate(chunks):
            metadata = dict(chunk.metadata)
            payload.append(
                {
                    "chunk_id": f"{index_name}:{index}",
                    "document_id": metadata.pop("document_id"),
                    "source_type": metadata.pop("source_type"),
                    "title": metadata.pop("title"),
                    "source_uri": metadata.pop("source_uri", None),
                    "text": chunk.page_content,
                    "metadata": metadata,
                }
            )
        (index_dir / "chunks.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def _index_dir(self, index_name: str) -> Path:
        safe_name = "".join(character for character in index_name if character.isalnum() or character in "-_")
        if not safe_name:
            safe_name = "default"
        index_dir = (self.index_root / safe_name).resolve()
        if not self._is_relative_to(index_dir, self.index_root):
            msg = f"Unsafe RAG index path rejected for index_name={index_name!r}"
            raise ValueError(msg)
        return index_dir

    @staticmethod
    def _is_relative_to(path: Path, parent: Path) -> bool:
        try:
            path.relative_to(parent)
            return True
        except ValueError:
            return False

    @staticmethod
    def _default_embedding_provider() -> GraniteEmbeddingProvider | HashEmbeddingProvider:
        try:
            return GraniteEmbeddingProvider()
        except Exception:
            return HashEmbeddingProvider()
