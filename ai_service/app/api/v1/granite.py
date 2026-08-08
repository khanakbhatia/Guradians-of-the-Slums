"""RAG-grounded IBM Granite API endpoints.

The /granite path is preserved for frontend/backend compatibility.
"""

from fastapi import APIRouter, HTTPException

from app.schemas.granite import GraniteGenerationRequest, GraniteGenerationResponse
from app.services.llm.granite_client import GraniteClient, GraniteGroundingError

router = APIRouter(prefix="/granite", tags=["granite-generation"])


@router.post("/generate", response_model=GraniteGenerationResponse)
async def generate_grounded_response(
    request: GraniteGenerationRequest,
) -> GraniteGenerationResponse:
    """Generate incident outputs with local IBM Granite only from retrieved RAG grounding."""

    try:
        return GraniteClient().generate(request)
    except GraniteGroundingError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
