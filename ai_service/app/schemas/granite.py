"""Schemas for RAG-grounded IBM Granite generation."""

from enum import StrEnum

from pydantic import BaseModel, Field

from app.schemas.rag import KnowledgeSourceType, RetrievedContext


class GraniteOutputType(StrEnum):
    """Supported grounded IBM Granite outputs."""

    INCIDENT_REPORT = "incident_report"
    CITIZEN_ALERT = "citizen_alert"
    NGO_ACTION_PLAN = "ngo_action_plan"
    AUTHORITY_BRIEFING = "authority_briefing"
    MULTILINGUAL_ALERT = "multilingual_alert"


class GraniteGenerationRequest(BaseModel):
    """Request for grounded IBM Granite generation."""

    output_type: GraniteOutputType
    incident_context: str
    index_name: str = "disaster_knowledge"
    top_k: int = Field(default=5, ge=1, le=20)
    source_types: list[KnowledgeSourceType] = Field(default_factory=list)
    target_languages: list[str] = Field(default_factory=list)
    location_name: str | None = None
    audience: str | None = None


class GroundingCitation(BaseModel):
    """Citation for a retrieved grounding context."""

    citation_id: str
    chunk_id: str
    document_id: str
    title: str
    source_type: KnowledgeSourceType
    source_uri: str | None = None
    score: float


class GraniteGenerationResponse(BaseModel):
    """Grounded IBM Granite generation response."""

    output_type: GraniteOutputType
    generated_text: str
    grounded: bool
    model_id: str
    citations: list[GroundingCitation]
    retrieved_contexts: list[RetrievedContext]
