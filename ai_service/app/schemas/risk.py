"""Request and response schemas for deterministic risk scoring."""

from enum import StrEnum

from pydantic import BaseModel, Field

from app.schemas.graph import GraphAnalysisResponse
from app.schemas.vision import BoundingBox, GeoBoundingBox, VisionAnalysisResponse


class RiskType(StrEnum):
    """Supported risk dimensions."""

    FLOOD = "flood"
    FIRE = "fire"
    OVERALL = "overall"


class RiskLevel(StrEnum):
    """Human-readable risk band."""

    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class RainfallObservation(BaseModel):
    """Rainfall signal used for scoring."""

    rainfall_mm_24h: float = Field(ge=0)
    rainfall_mm_72h: float = Field(default=0.0, ge=0)
    rainfall_intensity_mm_per_hr: float = Field(default=0.0, ge=0)
    data_source: str | None = None


class HistoricalFloodRecord(BaseModel):
    """Historical flood signal used for scoring."""

    event_id: str
    flood_depth_m: float | None = Field(default=None, ge=0)
    affected_buildings: int | None = Field(default=None, ge=0)
    displaced_people: int | None = Field(default=None, ge=0)
    severity_score: float = Field(default=0.5, ge=0.0, le=1.0)
    years_ago: float | None = Field(default=None, ge=0)


class RiskFeatureContribution(BaseModel):
    """Feature contribution to a risk score."""

    feature_name: str
    value: float | int | str | bool | None
    contribution: float = Field(ge=0.0, le=1.0)
    weight: float = Field(ge=0.0, le=1.0)
    direction: str
    explanation: str


class VisualOverlay(BaseModel):
    """Overlay instruction consumable by map or image clients."""

    overlay_id: str
    overlay_type: str
    label: str
    risk_type: RiskType
    severity: float = Field(ge=0.0, le=1.0)
    bounding_box: BoundingBox | None = None
    geo_coordinates: GeoBoundingBox | None = None
    path_coordinates: list[dict[str, float]] = Field(default_factory=list)
    style: dict[str, str | float | int] = Field(default_factory=dict)


class RiskExplanation(BaseModel):
    """Structured explanation for one prediction."""

    why: str
    human_readable_reasoning: str
    confidence: float = Field(ge=0.0, le=1.0)
    feature_contributions: list[RiskFeatureContribution]
    visual_overlays: list[VisualOverlay] = Field(default_factory=list)


class RiskScore(BaseModel):
    """A scored risk prediction with explanation."""

    risk_type: RiskType
    score: float = Field(ge=0.0, le=1.0)
    level: RiskLevel
    confidence: float = Field(ge=0.0, le=1.0)
    explanation: RiskExplanation


class RiskScoringRequest(BaseModel):
    """Risk scoring request from prepared AI outputs and hazard signals."""

    area_id: str
    cv_output: VisionAnalysisResponse
    road_graph: GraphAnalysisResponse
    rainfall: RainfallObservation
    historical_floods: list[HistoricalFloodRecord] = Field(default_factory=list)


class RiskScoringResponse(BaseModel):
    """Risk scoring response."""

    area_id: str
    flood_risk: RiskScore
    fire_risk: RiskScore
    overall_risk: RiskScore
    confidence_score: float = Field(ge=0.0, le=1.0)
    model_version: str
