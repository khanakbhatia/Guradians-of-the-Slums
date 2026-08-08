"""Evacuation planning API endpoints."""

from fastapi import APIRouter

from app.schemas.evacuation import EvacuationPlanningRequest, EvacuationPlanningResponse
from app.services.planning.evacuation_planner import EvacuationPlanner

router = APIRouter(prefix="/evacuation", tags=["evacuation"])


@router.post("/plan", response_model=EvacuationPlanningResponse)
async def plan_evacuation(request: EvacuationPlanningRequest) -> EvacuationPlanningResponse:
    """Generate best and alternative evacuation routes."""

    return EvacuationPlanner().plan(request)
