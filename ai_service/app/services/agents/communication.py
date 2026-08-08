"""Communication records for Granite task delegation and reasoning traces."""

from __future__ import annotations

from uuid import uuid4

from app.schemas.agents import (
    BeeAIAgentName,
    BeeAIFailure,
    BeeAIReasoningEvent,
    BeeAITaskDelegation,
    BeeAIWorkflowStep,
)


class BeeAICommunicationLog:
    """Collect task delegation, reasoning, retry, and failure records."""

    def __init__(self) -> None:
        self.task_delegations: list[BeeAITaskDelegation] = []
        self.reasoning_flow: list[BeeAIReasoningEvent] = []
        self.failures: list[BeeAIFailure] = []

    def delegate(self, step: BeeAIWorkflowStep, attempt: int) -> BeeAITaskDelegation:
        """Record a coordinator-to-agent task delegation."""

        delegation = BeeAITaskDelegation(
            delegation_id=str(uuid4()),
            from_agent="coordinator",
            to_agent=step.agent,
            step_id=step.step_id,
            task=step.prompt,
            expected_output=step.expected_output,
            depends_on=step.depends_on,
            status="delegated",
            attempt=attempt,
        )
        self.task_delegations.append(delegation)
        self.event(
            event_type="task_delegated",
            message=f"Delegated {step.step_id} to {step.agent.value}.",
            attempt=attempt,
            step_id=step.step_id,
            agent=step.agent,
        )
        return delegation

    def complete_delegation(self, step_id: str, attempt: int) -> None:
        """Mark a delegated task complete."""

        for delegation in self.task_delegations:
            if delegation.step_id == step_id and delegation.attempt == attempt:
                delegation.status = "completed"

    def event(
        self,
        event_type: str,
        message: str,
        attempt: int,
        step_id: str | None = None,
        agent: BeeAIAgentName | None = None,
    ) -> None:
        """Record an observable reasoning event."""

        self.reasoning_flow.append(
            BeeAIReasoningEvent(
                event_id=str(uuid4()),
                step_id=step_id,
                agent=agent,
                event_type=event_type,
                message=message,
                attempt=attempt,
            )
        )

    def failure(
        self,
        error_type: str,
        message: str,
        attempt: int,
        retryable: bool,
        step_id: str | None = None,
        agent: BeeAIAgentName | None = None,
    ) -> BeeAIFailure:
        """Record a failure and optional retry marker."""

        failure = BeeAIFailure(
            failure_id=str(uuid4()),
            step_id=step_id,
            agent=agent,
            error_type=error_type,
            message=message,
            attempt=attempt,
            retryable=retryable,
        )
        self.failures.append(failure)
        self.event(
            event_type="retry_scheduled" if retryable else "workflow_failed",
            message=message,
            attempt=attempt,
            step_id=step_id,
            agent=agent,
        )
        return failure
