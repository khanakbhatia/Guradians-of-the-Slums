"""Schemas for explainable resource allocation."""

from enum import StrEnum

from pydantic import BaseModel, Field


class ResourceType(StrEnum):
    """Supported emergency resource categories."""

    MEDICAL_TEAM = "medical_team"
    FOOD = "food"
    WATER = "water"
    RESCUE_TEAM = "rescue_team"
    SHELTER = "shelter"


class AllocationPriority(StrEnum):
    """Operational priority bands."""

    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class ResourceNeed(BaseModel):
    """Requested resource quantity for one affected zone."""

    resource_type: ResourceType
    quantity: int = Field(ge=0)


class AffectedZone(BaseModel):
    """Affected area requiring resources."""

    zone_id: str
    name: str | None = None
    risk_score: float = Field(ge=0.0, le=1.0)
    priority: AllocationPriority
    needs: list[ResourceNeed]


class ResourceInventoryItem(BaseModel):
    """Available resource pool."""

    resource_id: str
    resource_type: ResourceType
    label: str | None = None
    available_quantity: int = Field(ge=0)
    distance_km: float = Field(ge=0)
    reliability_score: float = Field(default=1.0, ge=0.0, le=1.0)


class ResourceAllocationRequest(BaseModel):
    """Resource allocation request."""

    incident_id: str
    zones: list[AffectedZone]
    resources: list[ResourceInventoryItem]


class AllocationContribution(BaseModel):
    """Explainable contribution to allocation utility."""

    factor: str
    value: float | int | str | bool | None
    contribution: float = Field(ge=0.0, le=1.0)
    weight: float = Field(ge=0.0, le=1.0)
    reason: str


class ResourceAllocationDecision(BaseModel):
    """Single resource allocation decision."""

    zone_id: str
    zone_name: str | None = None
    resource_id: str
    resource_type: ResourceType
    allocated_quantity: int = Field(ge=0)
    utility_score: float = Field(ge=0.0, le=1.0)
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str
    contributions: list[AllocationContribution]


class UnmetResourceNeed(BaseModel):
    """Unmet need after allocation."""

    zone_id: str
    resource_type: ResourceType
    unmet_quantity: int = Field(ge=0)
    reason: str


class ResourceAllocationResponse(BaseModel):
    """Resource allocation response."""

    incident_id: str
    allocations: list[ResourceAllocationDecision]
    unmet_needs: list[UnmetResourceNeed]
    remaining_resources: list[ResourceInventoryItem]
    allocation_method: str
