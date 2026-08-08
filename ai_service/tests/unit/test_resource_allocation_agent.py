from app.schemas.resource_allocation import (
    AffectedZone,
    AllocationPriority,
    ResourceAllocationRequest,
    ResourceInventoryItem,
    ResourceNeed,
    ResourceType,
)
from app.services.agents.resource_allocation_agent import ResourceAllocationAgent


def test_resource_allocation_prioritizes_critical_high_risk_zone() -> None:
    request = ResourceAllocationRequest(
        incident_id="incident-1",
        zones=[
            AffectedZone(
                zone_id="z-low",
                risk_score=0.3,
                priority=AllocationPriority.MODERATE,
                needs=[ResourceNeed(resource_type=ResourceType.WATER, quantity=5)],
            ),
            AffectedZone(
                zone_id="z-critical",
                risk_score=0.95,
                priority=AllocationPriority.CRITICAL,
                needs=[ResourceNeed(resource_type=ResourceType.WATER, quantity=5)],
            ),
        ],
        resources=[
            ResourceInventoryItem(
                resource_id="water-1",
                resource_type=ResourceType.WATER,
                available_quantity=5,
                distance_km=2,
                reliability_score=0.9,
            )
        ],
    )

    response = ResourceAllocationAgent().allocate(request)

    assert response.allocations[0].zone_id == "z-critical"
    assert response.allocations[0].reason
    assert response.unmet_needs[0].zone_id == "z-low"
