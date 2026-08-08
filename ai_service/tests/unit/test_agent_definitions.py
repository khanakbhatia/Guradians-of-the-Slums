from app.schemas.agents import BeeAIAgentName
from app.services.agents.definitions import AGENT_DEFINITIONS, build_workflow_steps


def test_agent_definitions_include_required_specialists() -> None:
    names = {definition.name for definition in AGENT_DEFINITIONS}

    assert BeeAIAgentName.RISK_ANALYST in names
    assert BeeAIAgentName.VOLUNTEER_COORDINATOR in names
    assert BeeAIAgentName.EMERGENCY_PLANNER in names
    assert BeeAIAgentName.RESOURCE_ALLOCATOR in names
    assert BeeAIAgentName.REPORT_GENERATOR in names
    assert BeeAIAgentName.CITIZEN_ASSISTANT in names


def test_workflow_steps_include_citizen_alerting_when_requested() -> None:
    steps = build_workflow_steps(
        incident_context="Flooding near settlement edge.",
        include_citizen_alert=True,
        include_authority_briefing=True,
        include_ngo_plan=True,
        target_languages=["English", "Hindi"],
    )

    assert steps[-1].agent == BeeAIAgentName.CITIZEN_ASSISTANT
