"""RAG-grounded IBM Granite API endpoints."""

from fastapi import APIRouter, HTTPException

from app.schemas.granite import GraniteGenerationRequest, GraniteGenerationResponse
from app.services.llm.granite_client import GraniteClient, GraniteGroundingError

router = APIRouter(prefix="/granite", tags=["granite"])


@router.post("/generate", response_model=GraniteGenerationResponse)
async def generate_grounded_response(
    request: GraniteGenerationRequest,
) -> GraniteGenerationResponse:
    """Generate incident outputs only from retrieved RAG grounding."""

    try:
        return GraniteClient().generate(request)
    except GraniteGroundingError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
