"""AI explainability API endpoints."""

from fastapi import APIRouter

from app.schemas.explainability import RiskExplainabilityResponse
from app.schemas.risk import RiskScoringRequest
from app.services.risk.risk_engine import RiskScoringEngine

router = APIRouter(prefix="/explainability", tags=["explainability"])


@router.post("/risk", response_model=RiskExplainabilityResponse)
async def explain_risk(request: RiskScoringRequest) -> RiskExplainabilityResponse:
    """Return structured explanations for flood, fire, and overall risk."""

    scored = RiskScoringEngine().score(request)
    explanations = {
        "flood": scored.flood_risk.explanation,
        "fire": scored.fire_risk.explanation,
        "overall": scored.overall_risk.explanation,
    }
    visual_overlays = [
        overlay
        for explanation in explanations.values()
        for overlay in explanation.visual_overlays
    ]
    return RiskExplainabilityResponse(
        area_id=scored.area_id,
        explanations=explanations,
        visual_overlays=visual_overlays,
    )
