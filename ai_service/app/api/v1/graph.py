"""Graph AI API endpoints."""

from fastapi import APIRouter

from app.schemas.graph import GraphAnalysisRequest, GraphAnalysisResponse
from app.services.graph.route_graph import RoadGraphAnalyzer

router = APIRouter(prefix="/graph", tags=["graph-ai"])


@router.post("/roads/analyze", response_model=GraphAnalysisResponse)
async def analyze_road_graph(request: GraphAnalysisRequest) -> GraphAnalysisResponse:
    """Analyze road connectivity, bottlenecks, blocked roads, and safe paths."""

    analyzer = RoadGraphAnalyzer()
    return analyzer.analyze(request)
