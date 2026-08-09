"""RAG-grounded IBM Granite API endpoints.

The /granite path is preserved for frontend/backend compatibility.
"""

from fastapi import APIRouter, HTTPException

from app.schemas.granite import GraniteGenerationRequest, GraniteGenerationResponse
from app.services.llm.granite_client import (
    GraniteClient,
    GraniteGroundingError,
    GraniteRuntimeError,
)

router = APIRouter(prefix="/granite", tags=["granite-generation"])


@router.post("/generate", response_model=GraniteGenerationResponse)
async def generate_grounded_response(
    request: GraniteGenerationRequest,
) -> GraniteGenerationResponse:
    """Generate incident outputs with local IBM Granite only from retrieved RAG grounding."""

    try:
        return GraniteClient().generate(request)
    except GraniteGroundingError as exc:
        # Semantic refusal: request was valid, but there was no grounding
        # context (or the model's output didn't cite it) - a client-side
        # concern, not an infrastructure failure.
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except GraniteRuntimeError as exc:
        # Infrastructure failure: the local Ollama/Granite runtime itself
        # is unreachable or misbehaving. 503 (not 422) so callers - notably
        # the Node backend's aiServiceClient - can tell this apart from a
        # bad request and apply mock-data fallback instead of surfacing a
        # confusing validation error.
        raise HTTPException(status_code=503, detail=str(exc)) from exc
