"""Request and response schemas for AI explanations."""

from pydantic import BaseModel, Field

from app.schemas.risk import RiskExplanation, VisualOverlay


class RiskExplainabilityResponse(BaseModel):
    """Explanation-only response for risk predictions."""

    area_id: str
    explanations: dict[str, RiskExplanation]
    visual_overlays: list[VisualOverlay] = Field(default_factory=list)
