"""Retrieval-only RAG API endpoints."""

from fastapi import APIRouter

from app.schemas.rag import RagIndexRequest, RagIndexResponse, RagRetrievalRequest, RagRetrievalResponse
from app.services.rag.retriever import RagRetrievalService

router = APIRouter(prefix="/rag", tags=["rag-retrieval"])


@router.post("/index", response_model=RagIndexResponse)
async def build_rag_index(request: RagIndexRequest) -> RagIndexResponse:
    """Build or rebuild a FAISS retrieval index from knowledge sources."""

    return RagRetrievalService().build_index(request)


@router.post("/retrieve", response_model=RagRetrievalResponse)
async def retrieve_contexts(request: RagRetrievalRequest) -> RagRetrievalResponse:
    """Retrieve relevant knowledge contexts without generation."""

    return RagRetrievalService().retrieve(request)
