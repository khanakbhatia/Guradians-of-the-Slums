from app.schemas.evacuation import EvacuationPlanningRequest, Shelter
from app.schemas.graph import GeoCoordinate, GraphAnalysisRequest, RoadSegment
from app.services.graph.route_graph import RoadGraphAnalyzer
from app.services.planning.evacuation_planner import EvacuationPlanner


def test_evacuation_planner_returns_best_route_to_open_shelter() -> None:
    road_graph = RoadGraphAnalyzer().analyze(
        GraphAnalysisRequest(
            roads=[
                RoadSegment(
                    road_id="r1",
                    coordinates=[
                        GeoCoordinate(longitude=0.0, latitude=0.0),
                        GeoCoordinate(longitude=0.001, latitude=0.0),
                    ],
                )
            ]
        )
    )
    request = EvacuationPlanningRequest(
        incident_id="incident-1",
        origin=GeoCoordinate(longitude=0.0, latitude=0.0),
        road_graph=road_graph,
        shelters=[
            Shelter(
                shelter_id="s1",
                name="School Shelter",
                location=GeoCoordinate(longitude=0.001, latitude=0.0),
                capacity=100,
                current_occupancy=10,
            )
        ],
    )

    response = EvacuationPlanner().plan(request)

    assert response.best_route.found is True
    assert response.best_route.shelter_id == "s1"
    assert response.best_route.estimated_time_minutes is not None
