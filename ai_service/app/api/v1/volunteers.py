"""Volunteer matching API endpoints."""

from fastapi import APIRouter

from app.schemas.volunteers import VolunteerMatchingRequest, VolunteerMatchingResponse
from app.services.matching.volunteer_matcher import VolunteerMatcher

router = APIRouter(prefix="/volunteers", tags=["volunteers"])


@router.post("/match", response_model=VolunteerMatchingResponse)
async def match_volunteers(request: VolunteerMatchingRequest) -> VolunteerMatchingResponse:
    """Rank volunteers using deterministic explainable scoring."""

    return VolunteerMatcher().match(request)
