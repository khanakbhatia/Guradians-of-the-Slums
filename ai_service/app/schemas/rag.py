"""Request and response schemas for retrieval-only RAG services."""

from enum import StrEnum

from pydantic import BaseModel, Field


class KnowledgeSourceType(StrEnum):
    """Supported knowledge-source categories."""

    GOVERNMENT_SOP = "government_sop"
    DISASTER_GUIDELINE = "disaster_guideline"
    NGO_MANUAL = "ngo_manual"
    HISTORICAL_DISASTER_REPORT = "historical_disaster_report"
    MUNICIPAL_DOCUMENT = "municipal_document"


class KnowledgeDocumentInput(BaseModel):
    """Document payload for direct indexing."""

    document_id: str
    source_type: KnowledgeSourceType
    title: str
    text: str
    source_uri: str | None = None
    published_at: str | None = None
    jurisdiction: str | None = None
    tags: list[str] = Field(default_factory=list)


class RagIndexRequest(BaseModel):
    """Request to build or update a retrieval index."""

    index_name: str = "disaster_knowledge"
    documents: list[KnowledgeDocumentInput] = Field(default_factory=list)
    source_paths: list[str] = Field(default_factory=list)
    rebuild: bool = False


class RagIndexResponse(BaseModel):
    """Indexing result."""

    index_name: str
    indexed_documents: int
    indexed_chunks: int
    embedding_provider: str
    index_path: str


class RagRetrievalRequest(BaseModel):
    """Retrieval query request."""

    query: str
    index_name: str = "disaster_knowledge"
    top_k: int = Field(default=5, ge=1, le=20)
    source_types: list[KnowledgeSourceType] = Field(default_factory=list)


class RetrievedContext(BaseModel):
    """Single retrieved knowledge chunk."""

    chunk_id: str
    document_id: str
    source_type: KnowledgeSourceType
    title: str
    text: str
    score: float
    source_uri: str | None = None
    metadata: dict[str, str | int | float | bool | None] = Field(default_factory=dict)


class RagRetrievalResponse(BaseModel):
    """Retrieval-only response."""

    query: str
    index_name: str
    embedding_provider: str
    contexts: list[RetrievedContext]
