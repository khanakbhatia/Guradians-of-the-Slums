from app.schemas.graph import (
    GeoCoordinate,
    GraphAnalysisRequest,
    RoadSegment,
    RoadStatus,
    SafePathRequest,
)
from app.services.graph.route_graph import RoadGraphAnalyzer


def test_road_graph_analyzer_avoids_blocked_road() -> None:
    request = GraphAnalysisRequest(
        roads=[
            RoadSegment(
                road_id="main",
                coordinates=[
                    GeoCoordinate(latitude=0.0, longitude=0.0),
                    GeoCoordinate(latitude=0.0, longitude=0.001),
                ],
                status=RoadStatus.BLOCKED,
            ),
            RoadSegment(
                road_id="safe-a",
                coordinates=[
                    GeoCoordinate(latitude=0.0, longitude=0.0),
                    GeoCoordinate(latitude=0.001, longitude=0.0),
                ],
            ),
            RoadSegment(
                road_id="safe-b",
                coordinates=[
                    GeoCoordinate(latitude=0.001, longitude=0.0),
                    GeoCoordinate(latitude=0.0, longitude=0.001),
                ],
            ),
        ],
        safe_path=SafePathRequest(
            origin=GeoCoordinate(latitude=0.0, longitude=0.0),
            destination=GeoCoordinate(latitude=0.0, longitude=0.001),
        ),
    )

    response = RoadGraphAnalyzer().analyze(request)

    assert response.shortest_safe_path is not None
    assert response.shortest_safe_path.found is True
    assert "main" not in response.shortest_safe_path.road_ids
    assert response.blocked_roads[0].road_id == "main"
