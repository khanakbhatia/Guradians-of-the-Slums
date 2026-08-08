"""Risk scoring API endpoints."""

from fastapi import APIRouter

from app.schemas.risk import RiskScoringRequest, RiskScoringResponse
from app.services.risk.risk_engine import RiskScoringEngine

router = APIRouter(prefix="/risk", tags=["risk"])


@router.post("/score", response_model=RiskScoringResponse)
async def score_risk(request: RiskScoringRequest) -> RiskScoringResponse:
    """Score flood, fire, and overall risk with structured explanations."""

    return RiskScoringEngine().score(request)
