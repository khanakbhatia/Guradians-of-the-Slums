"""M2-facing convenience endpoints.

These routes are thin JSON facades over the versioned M3 AI services.
"""

import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.agents import BeeAIOrchestrationRequest, BeeAIOrchestrationResponse
from app.schemas.evacuation import EvacuationPlanningRequest, EvacuationPlanningResponse
from app.schemas.explainability import RiskExplainabilityResponse
from app.schemas.granite import GraniteGenerationRequest, GraniteGenerationResponse
from app.schemas.graph import GraphAnalysisRequest, GraphAnalysisResponse
from app.schemas.risk import RiskScoringRequest, RiskScoringResponse
from app.schemas.vision import VisionAnalysisResponse
from app.schemas.volunteers import VolunteerMatchingRequest, VolunteerMatchingResponse
from app.services.agents.coordinator import BeeAIDisasterCoordinator
from app.services.llm.granite_client import (
    GraniteClient,
    GraniteGroundingError,
    GraniteRuntimeError,
)
from app.services.graph.route_graph import RoadGraphAnalyzer
from app.services.matching.volunteer_matcher import VolunteerMatcher
from app.services.planning.evacuation_planner import EvacuationPlanner
from app.services.risk.risk_engine import RiskScoringEngine
from app.services.vision.cv_analyzer import ImageGeoReference, SatelliteVisionAnalyzer

router = APIRouter(tags=["m2-facade"])
logger = logging.getLogger(__name__)


@router.post("/detect", response_model=VisionAnalysisResponse)
async def detect_satellite_features(
    image: UploadFile = File(...),
    confidence_threshold: float = Form(0.25),
    west: float | None = Form(None),
    south: float | None = Form(None),
    east: float | None = Form(None),
    north: float | None = Form(None),
    model_name: str = Form("yolov8n.pt"),
) -> VisionAnalysisResponse:
    """Detect satellite features from an uploaded image."""

    try:
        image_bytes = await image.read()
        return SatelliteVisionAnalyzer(model_name=model_name).analyze_image_bytes(
            image_bytes=image_bytes,
            image_id=image.filename,
            confidence_threshold=confidence_threshold,
            geo_reference=_geo_reference(west, south, east, north),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/analyze", response_model=GraphAnalysisResponse)
async def analyze_graph(request: GraphAnalysisRequest) -> GraphAnalysisResponse:
    """Analyze road connectivity, bottlenecks, blocked roads, and safe paths."""

    return RoadGraphAnalyzer().analyze(request)


@router.post("/risk-score", response_model=RiskScoringResponse)
async def risk_score(request: RiskScoringRequest) -> RiskScoringResponse:
    """Generate flood, fire, and overall risk scores."""

    return RiskScoringEngine().score(request)


@router.post("/explain", response_model=RiskExplainabilityResponse)
async def explain_risk(request: RiskScoringRequest) -> RiskExplainabilityResponse:
    """Return explanation-only JSON for risk scores."""

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


@router.post("/assign", response_model=VolunteerMatchingResponse)
async def assign_volunteers(request: VolunteerMatchingRequest) -> VolunteerMatchingResponse:
    """Rank volunteers for assignment."""

    return VolunteerMatcher().match(request)


@router.post("/evacuate", response_model=EvacuationPlanningResponse)
async def evacuate(request: EvacuationPlanningRequest) -> EvacuationPlanningResponse:
    """Generate best and alternative evacuation routes."""

    return EvacuationPlanner().plan(request)


@router.post("/report", response_model=GraniteGenerationResponse)
async def report(request: GraniteGenerationRequest) -> GraniteGenerationResponse:
    """Generate a RAG-grounded IBM Granite report or alert."""

    try:
        return GraniteClient().generate(request)
    except GraniteGroundingError as exc:
        # Semantic refusal (no grounding context / uncited output) - a
        # client-side concern, not an infrastructure failure.
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except GraniteRuntimeError as exc:
        # Infrastructure failure (Ollama/Granite unreachable) - 503 so the
        # Node backend's mock-data fallback engages instead of surfacing a
        # confusing "grounding" validation error.
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/chat", response_model=BeeAIOrchestrationResponse)
async def chat(request: BeeAIOrchestrationRequest) -> BeeAIOrchestrationResponse:
    """Run the Granite-backed multi-agent incident assistant."""

    logger.warning("POST /chat accepted for incident_id=%s", request.incident_id)
    response = await BeeAIDisasterCoordinator().run(request)
    logger.warning("POST /chat completed for incident_id=%s status=%s", request.incident_id, response.status)
    return response


def _geo_reference(
    west: float | None,
    south: float | None,
    east: float | None,
    north: float | None,
) -> ImageGeoReference | None:
    if any(value is None for value in [west, south, east, north]):
        return None
    return ImageGeoReference(
        west=float(west),
        south=float(south),
        east=float(east),
        north=float(north),
    )
