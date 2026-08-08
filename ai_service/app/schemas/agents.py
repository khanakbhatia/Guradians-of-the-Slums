"""Request and response schemas for BeeAI multi-agent orchestration."""

from enum import StrEnum

from pydantic import BaseModel, Field


class BeeAIAgentName(StrEnum):
    """Specialized BeeAI agents in the disaster-response workflow."""

    RISK_ANALYST = "risk_analyst"
    VOLUNTEER_COORDINATOR = "volunteer_coordinator"
    EMERGENCY_PLANNER = "emergency_planner"
    RESOURCE_ALLOCATOR = "resource_allocator"
    REPORT_GENERATOR = "report_generator"
    CITIZEN_ASSISTANT = "citizen_assistant"


class BeeAIAgentDefinition(BaseModel):
    """Serializable agent design for M1/M2 visibility."""

    name: BeeAIAgentName
    display_name: str
    role: str
    goal: str
    memory: str
    tools: list[str]
    output: str


class BeeAIWorkflowStep(BaseModel):
    """One orchestration step."""

    step_id: str
    agent: BeeAIAgentName
    prompt: str
    expected_output: str
    depends_on: list[str] = Field(default_factory=list)


class BeeAIOrchestrationRequest(BaseModel):
    """Request for the BeeAI disaster-response team."""

    incident_id: str
    incident_context: str
    area_id: str | None = None
    index_name: str = "disaster_knowledge"
    target_languages: list[str] = Field(default_factory=list)
    include_citizen_alert: bool = True
    include_authority_briefing: bool = True
    include_ngo_plan: bool = True
    max_retries: int = Field(default=2, ge=0, le=5)


class BeeAITaskDelegation(BaseModel):
    """Explicit task handoff between the coordinator and a specialist agent."""

    delegation_id: str
    from_agent: str
    to_agent: BeeAIAgentName
    step_id: str
    task: str
    expected_output: str
    depends_on: list[str] = Field(default_factory=list)
    status: str = "pending"
    attempt: int = 0


class BeeAISharedMemoryEntry(BaseModel):
    """Shared incident memory entry visible across the BeeAI workflow."""

    memory_id: str
    author: str
    entry_type: str
    content: str
    related_step_id: str | None = None
    attempt: int = 0


class BeeAIReasoningEvent(BaseModel):
    """Observable reasoning-flow event for M1/M2."""

    event_id: str
    step_id: str | None = None
    agent: BeeAIAgentName | None = None
    event_type: str
    message: str
    attempt: int


class BeeAIFailure(BaseModel):
    """Failure or retry record."""

    failure_id: str
    step_id: str | None = None
    agent: BeeAIAgentName | None = None
    error_type: str
    message: str
    attempt: int
    retryable: bool


class BeeAIAgentResult(BaseModel):
    """Result from one specialist agent."""

    agent: BeeAIAgentName
    step_id: str
    output: str
    status: str = "completed"
    attempt: int = 1
    failure: BeeAIFailure | None = None


class BeeAIOrchestrationResponse(BaseModel):
    """Structured response from the BeeAI multi-agent workflow."""

    incident_id: str
    status: str
    final_answer: str
    agent_results: list[BeeAIAgentResult]
    workflow_steps: list[BeeAIWorkflowStep]
    agents: list[BeeAIAgentDefinition]
    task_delegations: list[BeeAITaskDelegation]
    shared_memory: list[BeeAISharedMemoryEntry]
    reasoning_flow: list[BeeAIReasoningEvent]
    failures: list[BeeAIFailure] = Field(default_factory=list)
