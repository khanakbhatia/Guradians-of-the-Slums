"""Explainable deterministic resource allocation agent."""

from __future__ import annotations

from collections import defaultdict

from app.schemas.resource_allocation import (
    AffectedZone,
    AllocationContribution,
    AllocationPriority,
    ResourceAllocationDecision,
    ResourceAllocationRequest,
    ResourceAllocationResponse,
    ResourceInventoryItem,
    ResourceNeed,
    ResourceType,
    UnmetResourceNeed,
)


ALLOCATION_METHOD = "deterministic_priority_risk_distance_availability_v1"


class ResourceAllocationAgent:
    """Allocate emergency resources using explainable deterministic scoring."""

    def allocate(self, request: ResourceAllocationRequest) -> ResourceAllocationResponse:
        """Allocate available resources to highest-utility zone needs."""

        remaining = {
            resource.resource_id: resource.model_copy()
            for resource in request.resources
            if resource.available_quantity > 0
        }
        allocations: list[ResourceAllocationDecision] = []
        unmet_needs: list[UnmetResourceNeed] = []

        needs = self._ordered_needs(request.zones)
        for zone, need in needs:
            needed_quantity = need.quantity
            while needed_quantity > 0:
                candidates = [
                    resource
                    for resource in remaining.values()
                    if resource.resource_type == need.resource_type and resource.available_quantity > 0
                ]
                if not candidates:
                    unmet_needs.append(
                        UnmetResourceNeed(
                            zone_id=zone.zone_id,
                            resource_type=need.resource_type,
                            unmet_quantity=needed_quantity,
                            reason="No available resource pool remains for this resource type.",
                        )
                    )
                    break

                ranked = sorted(
                    candidates,
                    key=lambda resource: self._utility_score(zone, resource).utility,
                    reverse=True,
                )
                resource = ranked[0]
                allocated = min(needed_quantity, resource.available_quantity)
                score = self._utility_score(zone, resource)
                allocations.append(
                    ResourceAllocationDecision(
                        zone_id=zone.zone_id,
                        zone_name=zone.name,
                        resource_id=resource.resource_id,
                        resource_type=resource.resource_type,
                        allocated_quantity=allocated,
                        utility_score=score.utility,
                        confidence=score.confidence,
                        reason=self._reason(zone, resource, allocated, score.utility),
                        contributions=score.contributions,
                    )
                )
                resource.available_quantity -= allocated
                needed_quantity -= allocated

        return ResourceAllocationResponse(
            incident_id=request.incident_id,
            allocations=allocations,
            unmet_needs=unmet_needs,
            remaining_resources=list(remaining.values()),
            allocation_method=ALLOCATION_METHOD,
        )

    @staticmethod
    def _ordered_needs(zones: list[AffectedZone]) -> list[tuple[AffectedZone, ResourceNeed]]:
        priority_weight = {
            AllocationPriority.LOW: 0.25,
            AllocationPriority.MODERATE: 0.5,
            AllocationPriority.HIGH: 0.75,
            AllocationPriority.CRITICAL: 1.0,
        }
        ordered: list[tuple[AffectedZone, ResourceNeed]] = []
        for zone in zones:
            for need in zone.needs:
                if need.quantity > 0:
                    ordered.append((zone, need))
        return sorted(
            ordered,
            key=lambda item: (
                priority_weight[item[0].priority],
                item[0].risk_score,
                ResourceAllocationAgent._resource_urgency(item[1].resource_type),
                item[1].quantity,
            ),
            reverse=True,
        )

    @staticmethod
    def _utility_score(zone: AffectedZone, resource: ResourceInventoryItem) -> "_AllocationScore":
        risk_value = zone.risk_score
        priority_value = {
            AllocationPriority.LOW: 0.25,
            AllocationPriority.MODERATE: 0.5,
            AllocationPriority.HIGH: 0.75,
            AllocationPriority.CRITICAL: 1.0,
        }[zone.priority]
        distance_value = max(0.0, 1.0 - min(resource.distance_km, 25.0) / 25.0)
        availability_value = min(1.0, resource.available_quantity / 20)
        reliability_value = resource.reliability_score

        contributions = [
            AllocationContribution(
                factor="risk",
                value=round(risk_value, 3),
                contribution=round(risk_value * 0.3, 3),
                weight=0.3,
                reason="higher-risk zones receive stronger allocation priority",
            ),
            AllocationContribution(
                factor="priority",
                value=zone.priority.value,
                contribution=round(priority_value * 0.25, 3),
                weight=0.25,
                reason="operational priority raises the zone in the allocation order",
            ),
            AllocationContribution(
                factor="distance",
                value=resource.distance_km,
                contribution=round(distance_value * 0.2, 3),
                weight=0.2,
                reason="closer resources are preferred for faster dispatch",
            ),
            AllocationContribution(
                factor="availability",
                value=resource.available_quantity,
                contribution=round(availability_value * 0.15, 3),
                weight=0.15,
                reason="larger available pools can satisfy urgent needs more reliably",
            ),
            AllocationContribution(
                factor="reliability",
                value=resource.reliability_score,
                contribution=round(reliability_value * 0.1, 3),
                weight=0.1,
                reason="more reliable resources improve confidence in assignment",
            ),
        ]
        utility = round(min(1.0, sum(item.contribution for item in contributions)), 3)
        confidence = round(
            min(
                1.0,
                (resource.reliability_score * 0.45)
                + (availability_value * 0.25)
                + (distance_value * 0.2)
                + (risk_value * 0.1),
            ),
            3,
        )
        return _AllocationScore(utility=utility, confidence=confidence, contributions=contributions)

    @staticmethod
    def _resource_urgency(resource_type: ResourceType) -> float:
        urgency = defaultdict(
            lambda: 0.5,
            {
                ResourceType.RESCUE_TEAM: 1.0,
                ResourceType.MEDICAL_TEAM: 0.95,
                ResourceType.WATER: 0.8,
                ResourceType.SHELTER: 0.75,
                ResourceType.FOOD: 0.65,
            },
        )
        return urgency[resource_type]

    @staticmethod
    def _reason(
        zone: AffectedZone,
        resource: ResourceInventoryItem,
        allocated_quantity: int,
        utility: float,
    ) -> str:
        return (
            f"Allocated {allocated_quantity} {resource.resource_type.value} from {resource.resource_id} "
            f"to {zone.zone_id} because the zone is {zone.priority.value} priority with "
            f"risk {zone.risk_score:.2f}, the resource is {resource.distance_km:g} km away, "
            f"and has reliability {resource.reliability_score:.2f}. Utility score {utility:.2f}."
        )


class _AllocationScore:
    """Internal utility score container."""

    def __init__(
        self,
        utility: float,
        confidence: float,
        contributions: list[AllocationContribution],
    ) -> None:
        self.utility = utility
        self.confidence = confidence
        self.contributions = contributions
