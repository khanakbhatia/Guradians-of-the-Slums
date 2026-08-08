"""Request and response schemas for satellite and CV analysis."""

from enum import StrEnum

from pydantic import BaseModel, Field


class VisionClass(StrEnum):
    """Supported satellite feature classes."""

    BUILDING = "building"
    ROOF_DENSITY = "roof_density"
    ROAD = "road"
    DRAINAGE = "drainage"
    OPEN_SPACE = "open_space"


class BoundingBox(BaseModel):
    """Pixel-space bounding box."""

    x_min: float
    y_min: float
    x_max: float
    y_max: float


class GeoPoint(BaseModel):
    """Longitude and latitude coordinate."""

    longitude: float
    latitude: float


class GeoBoundingBox(BaseModel):
    """Geographic bounding box in WGS84-like coordinate order."""

    north_west: GeoPoint
    north_east: GeoPoint
    south_east: GeoPoint
    south_west: GeoPoint


class VisionDetection(BaseModel):
    """Single satellite feature detection."""

    label: VisionClass
    confidence: float = Field(ge=0.0, le=1.0)
    bounding_box: BoundingBox
    geo_coordinates: GeoBoundingBox | None = None
    source: str
    metadata: dict[str, float | int | str | bool | None] = Field(default_factory=dict)


class VisionSummary(BaseModel):
    """Aggregate CV summary for a satellite image."""

    image_width: int
    image_height: int
    building_count: int
    road_count: int
    drainage_count: int
    open_space_count: int
    roof_density_score: float = Field(ge=0.0, le=1.0)


class VisionAnalysisResponse(BaseModel):
    """JSON response returned by the satellite CV endpoint."""

    image_id: str
    model_name: str
    detections: list[VisionDetection]
    summary: VisionSummary
