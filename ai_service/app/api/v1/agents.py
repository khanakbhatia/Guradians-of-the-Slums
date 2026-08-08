"""BeeAI orchestration API endpoints."""

from fastapi import APIRouter

from app.schemas.agents import (
    BeeAIAgentDefinition,
    BeeAIOrchestrationRequest,
    BeeAIOrchestrationResponse,
)
from app.schemas.resource_allocation import ResourceAllocationRequest, ResourceAllocationResponse
from app.services.agents.resource_allocation_agent import ResourceAllocationAgent
from app.services.agents.coordinator import BeeAIDisasterCoordinator
from app.services.agents.definitions import AGENT_DEFINITIONS

router = APIRouter(prefix="/agents", tags=["beeai-agents"])


@router.get("/definitions", response_model=list[BeeAIAgentDefinition])
async def get_agent_definitions() -> list[BeeAIAgentDefinition]:
    """Return role, goal, memory, tools, and output for each BeeAI agent."""

    return AGENT_DEFINITIONS


@router.post("/orchestrate", response_model=BeeAIOrchestrationResponse)
async def orchestrate_incident(
    request: BeeAIOrchestrationRequest,
) -> BeeAIOrchestrationResponse:
    """Run the BeeAI disaster-response multi-agent workflow."""

    return await BeeAIDisasterCoordinator().run(request)


@router.post("/resource-allocation", response_model=ResourceAllocationResponse)
async def allocate_resources(request: ResourceAllocationRequest) -> ResourceAllocationResponse:
    """Allocate medical, food, water, rescue, and shelter resources."""

    return ResourceAllocationAgent().allocate(request)
