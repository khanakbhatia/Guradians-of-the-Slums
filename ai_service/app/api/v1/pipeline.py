"""Integrated production pipeline API endpoint."""

from fastapi import APIRouter

from app.pipelines.integrated_ai_pipeline import IntegratedAIPipeline
from app.schemas.integration import IntegratedPipelineRequest, IntegratedPipelineResponse

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


@router.post("/run", response_model=IntegratedPipelineResponse)
async def run_pipeline(request: IntegratedPipelineRequest) -> IntegratedPipelineResponse:
    """Run the integrated AI pipeline and return a JSON stage trace."""

    return await IntegratedAIPipeline().run(request)
