"""Request and response schemas for NetworkX graph intelligence."""

from enum import StrEnum

from pydantic import BaseModel, Field


class RoadStatus(StrEnum):
    """Road availability state."""

    OPEN = "open"
    BLOCKED = "blocked"
    DEGRADED = "degraded"


class BuildingRole(StrEnum):
    """Building role for evacuation analysis."""

    RESIDENTIAL = "residential"
    SHELTER = "shelter"
    HOSPITAL = "hospital"
    SCHOOL = "school"
    COMMAND_CENTER = "command_center"
    UNKNOWN = "unknown"


class GeoCoordinate(BaseModel):
    """Longitude and latitude coordinate."""

    longitude: float
    latitude: float


class RoadSegment(BaseModel):
    """Road segment input."""

    road_id: str
    coordinates: list[GeoCoordinate] = Field(min_length=2)
    status: RoadStatus = RoadStatus.OPEN
    width_m: float | None = Field(default=None, ge=0)
    flood_depth_m: float | None = Field(default=None, ge=0)
    debris_score: float = Field(default=0.0, ge=0.0, le=1.0)
    capacity_score: float = Field(default=1.0, ge=0.0, le=1.0)


class BuildingFootprint(BaseModel):
    """Building point or footprint input."""

    building_id: str
    centroid: GeoCoordinate
    role: BuildingRole = BuildingRole.UNKNOWN
    occupancy_estimate: int | None = Field(default=None, ge=0)


class DrainageFeature(BaseModel):
    """Drainage feature input."""

    drainage_id: str
    coordinates: list[GeoCoordinate] = Field(min_length=2)
    blocked: bool = False
    overflow_risk: float = Field(default=0.0, ge=0.0, le=1.0)


class SafePathRequest(BaseModel):
    """Routing request for graph analysis."""

    origin: GeoCoordinate
    destination: GeoCoordinate
    avoid_blocked_roads: bool = True


class GraphAnalysisRequest(BaseModel):
    """Road connectivity graph analysis request."""

    roads: list[RoadSegment]
    buildings: list[BuildingFootprint] = Field(default_factory=list)
    drainage: list[DrainageFeature] = Field(default_factory=list)
    safe_path: SafePathRequest | None = None


class GraphNode(BaseModel):
    """Graph node returned as JSON."""

    node_id: str
    coordinate: GeoCoordinate
    degree: int
    nearby_building_count: int = 0
    occupancy_estimate: int = 0
    shelter_count: int = 0


class GraphEdge(BaseModel):
    """Graph edge returned as JSON."""

    edge_id: str
    road_id: str
    from_node_id: str
    to_node_id: str
    distance_m: float
    safety_cost: float
    status: RoadStatus


class EvacuationBottleneck(BaseModel):
    """Potential evacuation bottleneck."""

    bottleneck_id: str
    bottleneck_type: str
    node_id: str | None = None
    road_id: str | None = None
    coordinate: GeoCoordinate | None = None
    score: float
    reason: str


class BlockedRoad(BaseModel):
    """Blocked or unsafe road finding."""

    road_id: str
    edge_id: str
    reason: str
    severity: float = Field(ge=0.0, le=1.0)


class ShortestSafePath(BaseModel):
    """Shortest safe path response."""

    found: bool
    total_distance_m: float | None = None
    total_safety_cost: float | None = None
    node_ids: list[str] = Field(default_factory=list)
    road_ids: list[str] = Field(default_factory=list)
    coordinates: list[GeoCoordinate] = Field(default_factory=list)
    message: str | None = None


class RoadConnectivityGraph(BaseModel):
    """Serializable road connectivity graph."""

    nodes: list[GraphNode]
    edges: list[GraphEdge]
    connected_components: list[list[str]]
    isolated_node_ids: list[str]


class GraphAnalysisResponse(BaseModel):
    """NetworkX graph intelligence response."""

    graph: RoadConnectivityGraph
    evacuation_bottlenecks: list[EvacuationBottleneck]
    blocked_roads: list[BlockedRoad]
    shortest_safe_path: ShortestSafePath | None = None
