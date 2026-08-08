"""Request and response schemas for AI evacuation planning."""

from enum import StrEnum

from pydantic import BaseModel, Field

from app.schemas.graph import GeoCoordinate, GraphAnalysisResponse


class EvacuationPriority(StrEnum):
    """Evacuation priority levels."""

    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class ShelterStatus(StrEnum):
    """Shelter availability status."""

    OPEN = "open"
    LIMITED = "limited"
    CLOSED = "closed"


class RiskZone(BaseModel):
    """Circular risk zone used to penalize unsafe routes."""

    zone_id: str
    center: GeoCoordinate
    radius_m: float = Field(gt=0)
    severity: float = Field(ge=0.0, le=1.0)
    risk_type: str
    description: str | None = None


class Shelter(BaseModel):
    """Shelter destination candidate."""

    shelter_id: str
    name: str
    location: GeoCoordinate
    capacity: int = Field(ge=0)
    current_occupancy: int = Field(default=0, ge=0)
    status: ShelterStatus = ShelterStatus.OPEN


class EvacuationPlanningRequest(BaseModel):
    """Evacuation planning request."""

    incident_id: str
    origin: GeoCoordinate
    road_graph: GraphAnalysisResponse
    risk_zones: list[RiskZone] = Field(default_factory=list)
    shelters: list[Shelter]
    blocked_road_ids: list[str] = Field(default_factory=list)
    destination_shelter_id: str | None = None
    people_count: int = Field(default=1, ge=1)
    walking_speed_kmph: float = Field(default=4.0, gt=0)


class EvacuationRoute(BaseModel):
    """Planned evacuation route."""

    route_id: str
    found: bool
    shelter_id: str | None = None
    shelter_name: str | None = None
    road_ids: list[str] = Field(default_factory=list)
    node_ids: list[str] = Field(default_factory=list)
    coordinates: list[GeoCoordinate] = Field(default_factory=list)
    distance_m: float | None = None
    safety_cost: float | None = None
    estimated_time_minutes: float | None = None
    risk_zone_ids: list[str] = Field(default_factory=list)
    reason: str


class EvacuationPlanningResponse(BaseModel):
    """Evacuation planning response."""

    incident_id: str
    priority: EvacuationPriority
    best_route: EvacuationRoute
    alternative_route: EvacuationRoute | None = None
    blocked_road_ids: list[str]
    planning_method: str
