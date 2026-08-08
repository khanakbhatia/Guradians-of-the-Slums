"""Local IBM Granite multi-agent workflow coordinator."""

from __future__ import annotations

import asyncio

from app.integrations.local_granite import (
    LocalGraniteClient,
    LocalGraniteRequest,
)
from app.schemas.agents import (
    BeeAIAgentResult,
    BeeAIOrchestrationRequest,
    BeeAIOrchestrationResponse,
    BeeAIWorkflowStep,
)
from app.schemas.rag import RagRetrievalRequest, RetrievedContext
from app.services.agents.communication import BeeAICommunicationLog
from app.services.agents.definitions import AGENT_DEFINITIONS, build_workflow_steps
from app.services.agents.shared_memory import BeeAIIncidentMemory
from app.services.rag.retriever import RagRetrievalService


CHAT_CONTEXTS_PER_STEP = 1
CHAT_NUM_PREDICT = 90


class GraniteDisasterCoordinator:
    """Coordinates disaster-response specialist agents through local IBM Granite."""

    def __init__(
        self,
        granite_client: LocalGraniteClient | None = None,
        rag_service: RagRetrievalService | None = None,
    ) -> None:
        self.granite_client = granite_client or LocalGraniteClient()
        self.rag_service = rag_service or RagRetrievalService()

    async def run(self, request: BeeAIOrchestrationRequest) -> BeeAIOrchestrationResponse:
        """Run the Granite-backed multi-agent incident workflow."""

        steps = build_workflow_steps(
            incident_context=request.incident_context,
            include_citizen_alert=request.include_citizen_alert,
            include_authority_briefing=request.include_authority_briefing,
            include_ngo_plan=request.include_ngo_plan,
            target_languages=request.target_languages,
        )
        memory = BeeAIIncidentMemory()
        log = BeeAICommunicationLog()
        await memory.add_user_context(author="coordinator", content=self._initial_memory_context(request))

        max_attempts = request.max_retries + 1
        agent_results: list[BeeAIAgentResult] = []
        final_answer = ""
        status = "failed"

        for attempt in range(1, max_attempts + 1):
            try:
                log.event(
                    event_type="workflow_attempt_started",
                    message=f"Starting Granite workflow attempt {attempt}.",
                    attempt=attempt,
                )
                agent_results = []
                for step in steps:
                    result = await self._run_step(request, step, memory, log, attempt)
                    agent_results.append(result)
                final_answer = self._final_answer(agent_results)
                status = "completed"
                log.event(
                    event_type="workflow_completed",
                    message="Granite workflow completed successfully.",
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
                    final_answer = "Granite orchestration failed after all retry attempts."
                    agent_results = self._failed_agent_results(steps, attempt, str(exc))
                    break
                await asyncio.sleep(min(2**attempt, 8))

        return BeeAIOrchestrationResponse(
            incident_id=request.incident_id,
            status=status,
            final_answer=final_answer,
            agent_results=agent_results,
            workflow_steps=steps,
            agents=AGENT_DEFINITIONS,
            task_delegations=log.task_delegations,
            shared_memory=memory.entries,
            reasoning_flow=log.reasoning_flow,
            failures=log.failures,
        )

    async def _run_step(
        self,
        request: BeeAIOrchestrationRequest,
        step: BeeAIWorkflowStep,
        memory: BeeAIIncidentMemory,
        log: BeeAICommunicationLog,
        attempt: int,
    ) -> BeeAIAgentResult:
        log.delegate(step, attempt)
        log.event(
            event_type="granite_step_started",
            message=f"Granite step started: {step.step_id}.",
            attempt=attempt,
            step_id=step.step_id,
            agent=step.agent,
        )
        contexts = self._retrieve_contexts(request, step)
        prompt = self._granite_prompt(request, step, contexts, memory, attempt)
        response = self.granite_client.generate(
                LocalGraniteRequest(
                    prompt=prompt,
                    task_type=f"agent_{step.agent.value}",
                    num_predict=CHAT_NUM_PREDICT,
                    metadata={
                    "incident_id": request.incident_id,
                    "area_id": request.area_id,
                    "step_id": step.step_id,
                    "agent": step.agent.value,
                    "index_name": request.index_name,
                },
            )
        )
        output = response.text
        await memory.add_agent_output(
            author=step.agent.value,
            content=output,
            related_step_id=step.step_id,
            attempt=attempt,
        )
        log.complete_delegation(step.step_id, attempt)
        log.event(
            event_type="granite_step_completed",
            message=f"Granite step completed using {response.model_id}.",
            attempt=attempt,
            step_id=step.step_id,
            agent=step.agent,
        )
        return BeeAIAgentResult(
            agent=step.agent,
            step_id=step.step_id,
            output=output,
            status="completed",
            attempt=attempt,
        )

    def _retrieve_contexts(
        self,
        request: BeeAIOrchestrationRequest,
        step: BeeAIWorkflowStep,
    ) -> list[RetrievedContext]:
        retrieval = self.rag_service.retrieve(
            RagRetrievalRequest(
                query=f"{step.prompt} {request.incident_context}",
                index_name=request.index_name,
                top_k=CHAT_CONTEXTS_PER_STEP,
            )
        )
        return retrieval.contexts

    def _granite_prompt(
        self,
        request: BeeAIOrchestrationRequest,
        step: BeeAIWorkflowStep,
        contexts: list[RetrievedContext],
        memory: BeeAIIncidentMemory,
        attempt: int,
    ) -> str:
        return f"""
You are IBM Granite coordinating a disaster-response specialist workflow for informal settlements.

Agent: {step.agent.value}
Task: {step.prompt}
Expected output: {step.expected_output}

Rules:
- Use retrieved context when available.
- Do not invent disaster guidance, agencies, routes, capacities, or policy requirements.
- If retrieved context is insufficient, explicitly say "Not available in retrieved sources".
- Include citation markers like [1], [2] for factual claims based on retrieved context.
- Keep the output operational, concise, and safe for human review.
- Return no more than 4 short bullets or 70 words.

Incident:
{request.incident_context}

Area ID: {request.area_id or "not provided"}
Target languages: {", ".join(request.target_languages) or "English"}
Attempt: {attempt}

Retrieved context:
{self._context_block(contexts)}

Shared memory:
{memory.snapshot_text()}
""".strip()

    @staticmethod
    def _context_block(contexts: list[RetrievedContext]) -> str:
        if not contexts:
            return "No RAG contexts retrieved for this step."
        return "\n\n".join(
            f"[{index + 1}] {context.title} ({context.source_type.value})\n{context.text}"
            for index, context in enumerate(contexts)
        )

    @staticmethod
    def _final_answer(agent_results: list[BeeAIAgentResult]) -> str:
        if not agent_results:
            return ""
        return "\n\n".join(
            f"{result.agent.value}: {result.output}" for result in agent_results if result.output
        )

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
                output=f"No output produced because Granite orchestration failed: {message}",
                status="failed",
                attempt=attempt,
                failure=None,
            )
            for step in steps
        ]


BeeAIDisasterCoordinator = GraniteDisasterCoordinator
