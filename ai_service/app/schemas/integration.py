"""Schemas for the integrated production AI pipeline."""

from pydantic import BaseModel, Field

from app.schemas.agents import BeeAIOrchestrationRequest, BeeAIOrchestrationResponse
from app.schemas.granite import GraniteGenerationRequest, GraniteGenerationResponse
from app.schemas.graph import GraphAnalysisRequest, GraphAnalysisResponse
from app.schemas.rag import RagRetrievalRequest, RagRetrievalResponse
from app.schemas.risk import RiskScoringRequest, RiskScoringResponse
from app.schemas.vision import VisionAnalysisResponse


class IntegratedPipelineRequest(BaseModel):
    """Production pipeline request for M2 orchestration."""

    pipeline_id: str
    satellite_output: VisionAnalysisResponse | None = None
    graph_input: GraphAnalysisRequest | None = None
    risk_input: RiskScoringRequest | None = None
    rag_input: RagRetrievalRequest | None = None
    granite_input: GraniteGenerationRequest | None = None
    beeai_input: BeeAIOrchestrationRequest | None = None


class PipelineStageStatus(BaseModel):
    """Status for one pipeline stage."""

    stage: str
    status: str
    message: str


class IntegratedPipelineResponse(BaseModel):
    """Stage-by-stage production pipeline response."""

    pipeline_id: str
    stage_statuses: list[PipelineStageStatus]
    cv_output: VisionAnalysisResponse | None = None
    graph_output: GraphAnalysisResponse | None = None
    risk_output: RiskScoringResponse | None = None
    rag_output: RagRetrievalResponse | None = None
    granite_output: GraniteGenerationResponse | None = None
    beeai_output: BeeAIOrchestrationResponse | None = None
    handoff_to_m2: dict[str, str | bool | None] = Field(default_factory=dict)
