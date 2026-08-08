from app.schemas.agents import BeeAIAgentName
from app.services.agents.communication import BeeAICommunicationLog
from app.services.agents.definitions import build_workflow_steps


def test_communication_log_records_task_delegation() -> None:
    step = build_workflow_steps(
        incident_context="Flooding near homes.",
        include_citizen_alert=False,
        include_authority_briefing=True,
        include_ngo_plan=True,
        target_languages=[],
    )[0]
    log = BeeAICommunicationLog()

    delegation = log.delegate(step, attempt=1)

    assert delegation.to_agent == BeeAIAgentName.RISK_ANALYST
    assert log.reasoning_flow[0].event_type == "task_delegated"
