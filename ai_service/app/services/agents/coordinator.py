"""BeeAI multi-agent workflow coordinator."""

from __future__ import annotations

import asyncio
import os

from beeai_framework.backend import ChatModel
from beeai_framework.emitter import EmitterOptions
from beeai_framework.workflows.agent import AgentWorkflow, AgentWorkflowInput

from app.schemas.agents import (
    BeeAIAgentResult,
    BeeAIOrchestrationRequest,
    BeeAIOrchestrationResponse,
    BeeAIWorkflowStep,
)
from app.services.agents.communication import BeeAICommunicationLog
from app.services.agents.definitions import AGENT_DEFINITIONS, build_workflow_steps
from app.services.agents.shared_memory import BeeAIIncidentMemory
from app.services.agents.tools import all_disaster_tools


class BeeAIDisasterCoordinator:
    """Coordinates the disaster-response specialist agents through BeeAI."""

    def __init__(self, model_name: str | None = None) -> None:
        self.model_name = model_name or os.getenv("BEEAI_CHAT_MODEL", "watsonx:ibm/granite-3-8b-instruct")

    async def run(self, request: BeeAIOrchestrationRequest) -> BeeAIOrchestrationResponse:
        """Run the BeeAI multi-agent incident workflow."""

        steps = build_workflow_steps(
            incident_context=request.incident_context,
            include_citizen_alert=request.include_citizen_alert,
            include_authority_briefing=request.include_authority_briefing,
            include_ngo_plan=request.include_ngo_plan,
            target_languages=request.target_languages,
        )
        memory = BeeAIIncidentMemory()
        log = BeeAICommunicationLog()
        await memory.add_user_context(
            author="coordinator",
            content=self._initial_memory_context(request),
        )

        response = None
        final_answer = ""
        agent_results: list[BeeAIAgentResult] = []
        max_attempts = request.max_retries + 1

        for attempt in range(1, max_attempts + 1):
            try:
                log.event(
                    event_type="workflow_attempt_started",
                    message=f"Starting BeeAI workflow attempt {attempt}.",
                    attempt=attempt,
                )
                for step in steps:
                    log.delegate(step, attempt)

                workflow = self._build_workflow()
                workflow_inputs = self._workflow_inputs(request, steps, memory, attempt)
                response = await self._run_workflow_with_observers(workflow, workflow_inputs, log, attempt)
                final_answer = self._final_answer(response)
                agent_results = await self._agent_results(response, steps, final_answer, memory, log, attempt)
                log.event(
                    event_type="workflow_completed",
                    message="BeeAI workflow completed successfully.",
                    attempt=attempt,
                )
                break
            except Exception as exc:
                retryable = attempt < max_attempts
                log.failure(
                    error_type=exc.__class__.__name__,
                    message=str(exc),
                    attempt=attempt,
                    retryable=retryable,
                )
                await memory.add_user_context(
                    author="coordinator",
                    content=f"Attempt {attempt} failed with {exc.__class__.__name__}: {exc}",
                    attempt=attempt,
                )
                if not retryable:
                    final_answer = "BeeAI orchestration failed after all retry attempts."
                    agent_results = self._failed_agent_results(steps, attempt, str(exc))
                    break
                await asyncio.sleep(min(2**attempt, 8))

        return BeeAIOrchestrationResponse(
            incident_id=request.incident_id,
            status="completed" if response is not None else "failed",
            final_answer=final_answer,
            agent_results=agent_results,
            workflow_steps=steps,
            agents=AGENT_DEFINITIONS,
            task_delegations=log.task_delegations,
            shared_memory=memory.entries,
            reasoning_flow=log.reasoning_flow,
            failures=log.failures,
        )

    def _build_workflow(self) -> AgentWorkflow:
        llm = ChatModel.from_name(self.model_name)
        workflow = AgentWorkflow(name="Guardians Disaster Response Team")
        tools = all_disaster_tools()

        for definition in AGENT_DEFINITIONS:
            workflow.add_agent(
                name=definition.display_name.replace(" ", ""),
                role=definition.role,
                instructions=(
                    f"Goal: {definition.goal}\n"
                    f"Memory: use the shared BeeAI workflow context and prior agent outputs.\n"
                    f"Output: {definition.output}\n"
                    "Use tools when facts, risk scores, retrieval, or generation are needed. "
                    "Never invent disaster guidance. Granite generation must use the grounded_granite_tool."
                ),
                tools=tools,
                llm=llm,
            )

        return workflow

    async def _run_workflow_with_observers(
        self,
        workflow: AgentWorkflow,
        workflow_inputs: list[AgentWorkflowInput],
        log: BeeAICommunicationLog,
        attempt: int,
    ) -> object:
        run = workflow.run(inputs=workflow_inputs)
        return await (
            run.on(
                "start",
                lambda data, event: log.event(
                    event_type="beeai_step_started",
                    message=f"BeeAI step started: {getattr(data, 'step', 'unknown')}.",
                    attempt=attempt,
                    step_id=str(getattr(data, "step", "")) or None,
                ),
            )
            .on(
                "success",
                lambda data, event: log.event(
                    event_type="beeai_step_succeeded",
                    message=f"BeeAI step succeeded: {getattr(data, 'step', 'unknown')}.",
                    attempt=attempt,
                    step_id=str(getattr(data, "step", "")) or None,
                ),
            )
            .on(
                "error",
                lambda data, event: log.event(
                    event_type="beeai_step_error",
                    message=f"BeeAI step error: {getattr(data, 'step', 'unknown')}.",
                    attempt=attempt,
                    step_id=str(getattr(data, "step", "")) or None,
                ),
            )
            .on(
                lambda event: isinstance(event.creator, ChatModel) and event.name == "success",
                lambda data, event: log.event(
                    event_type="agent_model_response",
                    message="BeeAI agent produced an LLM response.",
                    attempt=attempt,
                ),
                EmitterOptions(match_nested=True),
            )
        )

    def _workflow_inputs(
        self,
        request: BeeAIOrchestrationRequest,
        steps: list[BeeAIWorkflowStep],
        memory: BeeAIIncidentMemory,
        attempt: int,
    ) -> list[AgentWorkflowInput]:
        return [
            AgentWorkflowInput(
                prompt=self._delegation_prompt(step),
                context=self._shared_context(request, step.depends_on, memory, attempt),
                expected_output=step.expected_output,
            )
            for step in steps
        ]

    @staticmethod
    def _delegation_prompt(step: BeeAIWorkflowStep) -> str:
        return (
            f"Assigned specialist: {step.agent.value}.\n"
            f"Task delegation ID: {step.step_id}.\n"
            f"Task: {step.prompt}\n"
            f"Expected output: {step.expected_output}\n"
            "Communicate important findings through the shared workflow context. "
            "When you rely on generated disaster guidance, call grounded_granite_tool."
        )

    @staticmethod
    def _shared_context(
        request: BeeAIOrchestrationRequest,
        depends_on: list[str],
        memory: BeeAIIncidentMemory,
        attempt: int,
    ) -> str:
        return (
            f"Incident ID: {request.incident_id}\n"
            f"Area ID: {request.area_id or 'not provided'}\n"
            f"RAG index: {request.index_name}\n"
            f"Target languages: {', '.join(request.target_languages) or 'English'}\n"
            f"Depends on: {', '.join(depends_on) or 'none'}\n"
            f"Attempt: {attempt}\n"
            f"Incident context: {request.incident_context}\n"
            f"Shared memory:\n{memory.snapshot_text()}"
        )

    async def _agent_results(
        self,
        response: object,
        steps: list[BeeAIWorkflowStep],
        final_answer: str,
        memory: BeeAIIncidentMemory,
        log: BeeAICommunicationLog,
        attempt: int,
    ) -> list[BeeAIAgentResult]:
        results: list[BeeAIAgentResult] = []
        for index, step in enumerate(steps):
            output = self._step_output(response, step.step_id, index, final_answer)
            log.complete_delegation(step.step_id, attempt)
            await memory.add_agent_output(
                author=step.agent.value,
                content=output,
                related_step_id=step.step_id,
                attempt=attempt,
            )
            results.append(
                BeeAIAgentResult(
                    agent=step.agent,
                    step_id=step.step_id,
                    output=output,
                    status="completed",
                    attempt=attempt,
                )
            )
        return results

    @staticmethod
    def _step_output(response: object, step_id: str, index: int, fallback: str) -> str:
        steps = getattr(response, "steps", []) or []
        for step in steps:
            if getattr(step, "name", "") == step_id:
                return str(getattr(step, "output", "") or fallback)
        if index < len(steps):
            step = steps[index]
            output = getattr(step, "output", None) or getattr(step, "result", None)
            if output:
                return str(output)
        return fallback

    @staticmethod
    def _final_answer(response: object) -> str:
        state = getattr(response, "state", None)
        if state is not None:
            final_answer = getattr(state, "final_answer", None)
            if final_answer:
                return str(final_answer)
        result = getattr(response, "result", None)
        if result is not None:
            final_answer = getattr(result, "final_answer", None) or getattr(result, "finalAnswer", None)
            if final_answer:
                return str(final_answer)
        return ""

    @staticmethod
    def _initial_memory_context(request: BeeAIOrchestrationRequest) -> str:
        return (
            f"Incident {request.incident_id}: {request.incident_context}. "
            f"Area: {request.area_id or 'not provided'}. "
            f"RAG index: {request.index_name}."
        )

    @staticmethod
    def _failed_agent_results(
        steps: list[BeeAIWorkflowStep],
        attempt: int,
        message: str,
    ) -> list[BeeAIAgentResult]:
        return [
            BeeAIAgentResult(
                agent=step.agent,
                step_id=step.step_id,
                output=f"No output produced because BeeAI orchestration failed: {message}",
                status="failed",
                attempt=attempt,
                failure=None,
            )
            for step in steps
        ]
