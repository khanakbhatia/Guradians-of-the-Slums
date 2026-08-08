"""AI evaluation API endpoints."""

from fastapi import APIRouter

from app.pipelines.evaluation_pipeline import AIEvaluationPipeline
from app.schemas.evaluation import EvaluationRequest, EvaluationResponse

router = APIRouter(prefix="/evaluation", tags=["evaluation"])


@router.post("/run", response_model=EvaluationResponse)
async def run_evaluation(request: EvaluationRequest) -> EvaluationResponse:
    """Run the AI evaluation pipeline and return JSON metrics."""

    return AIEvaluationPipeline().evaluate(request)
