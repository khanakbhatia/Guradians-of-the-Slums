from app.schemas.graph import (
    GeoCoordinate,
    GraphAnalysisRequest,
    RoadSegment,
    RoadStatus,
)
from app.schemas.risk import HistoricalFloodRecord, RainfallObservation, RiskScoringRequest
from app.schemas.vision import VisionAnalysisResponse, VisionSummary
from app.services.graph.route_graph import RoadGraphAnalyzer
from app.services.risk.risk_engine import RiskScoringEngine


def test_risk_engine_returns_explanations_for_every_score() -> None:
    cv_output = VisionAnalysisResponse(
        image_id="demo",
        model_name="yolov8n.pt",
        detections=[],
        summary=VisionSummary(
            image_width=100,
            image_height=100,
            building_count=120,
            road_count=2,
            drainage_count=2,
            open_space_count=1,
            roof_density_score=0.65,
        ),
    )
    graph_output = RoadGraphAnalyzer().analyze(
        GraphAnalysisRequest(
            roads=[
                RoadSegment(
                    road_id="r1",
                    coordinates=[
                        GeoCoordinate(longitude=0, latitude=0),
                        GeoCoordinate(longitude=0.001, latitude=0),
                    ],
                    status=RoadStatus.BLOCKED,
                )
            ]
        )
    )
    request = RiskScoringRequest(
        area_id="area-1",
        cv_output=cv_output,
        road_graph=graph_output,
        rainfall=RainfallObservation(rainfall_mm_24h=90, rainfall_mm_72h=180),
        historical_floods=[
            HistoricalFloodRecord(event_id="f1", severity_score=0.8, years_ago=1)
        ],
    )

    response = RiskScoringEngine().score(request)

    assert response.flood_risk.explanation.why
    assert response.fire_risk.explanation.feature_contributions
    assert response.overall_risk.confidence > 0
