"""Schemas for AI evaluation metrics and benchmark reports."""

from pydantic import BaseModel, Field

from app.schemas.risk import RiskLevel


class EvaluationMetric(BaseModel):
    """Single named metric."""

    name: str
    value: float
    target: float | None = None
    passed: bool | None = None
    details: dict[str, float | int | str | bool | None] = Field(default_factory=dict)


class LatencySample(BaseModel):
    """Latency measurement in milliseconds."""

    operation: str
    latency_ms: float = Field(ge=0)


class DetectionBox(BaseModel):
    """Detection or ground-truth bounding box."""

    label: str
    x_min: float
    y_min: float
    x_max: float
    y_max: float
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)


class DetectionEvaluationCase(BaseModel):
    """One detection evaluation case."""

    case_id: str
    predicted_boxes: list[DetectionBox]
    ground_truth_boxes: list[DetectionBox]
    iou_threshold: float = Field(default=0.5, ge=0.0, le=1.0)


class RiskEvaluationCase(BaseModel):
    """One risk score evaluation case."""

    case_id: str
    predicted_score: float = Field(ge=0.0, le=1.0)
    actual_score: float = Field(ge=0.0, le=1.0)
    predicted_level: RiskLevel
    actual_level: RiskLevel
    confidence: float = Field(ge=0.0, le=1.0)


class RetrievalEvaluationCase(BaseModel):
    """One retrieval evaluation case."""

    case_id: str
    retrieved_document_ids: list[str]
    relevant_document_ids: list[str]
    top_k: int = Field(default=5, ge=1)


class GraniteEvaluationCase(BaseModel):
    """One grounded Granite response evaluation case."""

    case_id: str
    generated_text: str
    citation_ids: list[str]
    required_citation_ids: list[str]
    grounded: bool
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class ConfidenceEvaluationCase(BaseModel):
    """Generic confidence calibration case."""

    case_id: str
    confidence: float = Field(ge=0.0, le=1.0)
    correct: bool


class EvaluationRequest(BaseModel):
    """Full AI evaluation request."""

    run_id: str
    detection_cases: list[DetectionEvaluationCase] = Field(default_factory=list)
    risk_cases: list[RiskEvaluationCase] = Field(default_factory=list)
    retrieval_cases: list[RetrievalEvaluationCase] = Field(default_factory=list)
    granite_cases: list[GraniteEvaluationCase] = Field(default_factory=list)
    latency_samples: list[LatencySample] = Field(default_factory=list)
    confidence_cases: list[ConfidenceEvaluationCase] = Field(default_factory=list)


class EvaluationSection(BaseModel):
    """Metrics for one AI subsystem."""

    name: str
    metrics: list[EvaluationMetric]


class EvaluationResponse(BaseModel):
    """AI evaluation report."""

    run_id: str
    sections: list[EvaluationSection]
    overall_score: float
    summary: str
    evaluation_method: str
