"""Integrated AI production pipeline for M2 handoff."""

from __future__ import annotations

import asyncio
from typing import TypeVar, cast

from app.core.cache import (
    granite_agent_cache,
    granite_generation_cache,
    graph_cache,
    rag_cache,
    risk_cache,
    stable_cache_key,
)
from app.schemas.agents import BeeAIOrchestrationResponse
from app.schemas.graph import GraphAnalysisResponse
from app.schemas.integration import (
    IntegratedPipelineRequest,
    IntegratedPipelineResponse,
    PipelineStageStatus,
)
from app.schemas.rag import RagRetrievalResponse
from app.schemas.risk import RiskScoringResponse
from app.services.agents.coordinator import BeeAIDisasterCoordinator
from app.services.graph.route_graph import RoadGraphAnalyzer
from app.services.llm.granite_client import GraniteClient, GraniteGroundingError
from app.services.rag.retriever import RagRetrievalService
from app.services.risk.risk_engine import RiskScoringEngine


T = TypeVar("T")


class IntegratedAIPipeline:
    """Compose CV, Graph AI, Risk, RAG, Granite generation, and Granite agents."""

    async def run(self, request: IntegratedPipelineRequest) -> IntegratedPipelineResponse:
        """Run available pipeline stages and return JSON stage trace."""

        statuses: list[PipelineStageStatus] = []

        cv_output = request.satellite_output
        statuses.append(
            self._status(
                "satellite",
                "provided" if cv_output else "skipped",
                "Satellite/CV output provided by caller." if cv_output else "No satellite output provided.",
            )
        )

        graph_task = self._graph_task(request)
        risk_task = self._risk_task(request)
        rag_task = self._rag_task(request)
        graph_result, risk_result, rag_result = await asyncio.gather(
            graph_task,
            risk_task,
            rag_task,
            return_exceptions=True,
        )
        graph_output = self._successful_output(graph_result, GraphAnalysisResponse)
        risk_output = self._successful_output(risk_result, RiskScoringResponse)
        rag_output = self._successful_output(rag_result, RagRetrievalResponse)
        statuses.extend(
            self._parallel_stage_statuses(
                request,
                graph_output,
                risk_output,
                rag_output,
                graph_result,
                risk_result,
                rag_result,
            )
        )

        granite_output = None
        if request.granite_input:
            try:
                granite_output = granite_generation_cache.get_or_set(
                    stable_cache_key("granite-generation", request.granite_input),
                    lambda: GraniteClient().generate(request.granite_input),
                )
                statuses.append(
                    self._status(
                        "granite_generation",
                        "completed",
                        "Grounded Granite generation completed or reused from cache.",
                    )
                )
            except GraniteGroundingError as exc:
                statuses.append(self._status("granite_generation", "blocked", str(exc)))
            except Exception as exc:  # pragma: no cover - defensive boundary for external SDKs
                statuses.append(self._status("granite_generation", "failed", self._failure_message(exc)))
        else:
            statuses.append(self._status("granite_generation", "skipped", "No Granite generation input provided."))

        beeai_output = None
        if request.beeai_input:
            beeai_key = stable_cache_key("granite-agent", request.beeai_input)
            cached_beeai = granite_agent_cache.get(beeai_key)
            if cached_beeai is None:
                beeai_output = await BeeAIDisasterCoordinator().run(request.beeai_input)
                granite_agent_cache.set(beeai_key, beeai_output)
            else:
                beeai_output = cast("BeeAIOrchestrationResponse", cached_beeai)
            statuses.append(
                self._status("granite_agents", "completed", "Granite orchestration completed or reused from cache.")
            )
        else:
            statuses.append(self._status("granite_agents", "skipped", "No Granite orchestration input provided."))

        statuses.append(
            self._status("fastapi", "completed", "Pipeline response prepared for M2 backend.")
        )

        return IntegratedPipelineResponse(
            pipeline_id=request.pipeline_id,
            stage_statuses=statuses,
            cv_output=cv_output,
            graph_output=graph_output,
            risk_output=risk_output,
            rag_output=rag_output,
            granite_output=granite_output,
            beeai_output=beeai_output,
            handoff_to_m2={
                "ready": True,
                "contract": "JSON",
                "recommended_endpoint": "/api/v1/pipeline/run",
                "optimization": "parallel_graph_risk_rag_with_granite_ttl_cache",
            },
        )

    @staticmethod
    def _status(stage: str, status: str, message: str) -> PipelineStageStatus:
        return PipelineStageStatus(stage=stage, status=status, message=message)

    @staticmethod
    def _successful_output(result: object, expected_type: type[T]) -> T | None:
        if isinstance(result, BaseException) or result is None:
            return None
        if not isinstance(result, expected_type):
            msg = f"Unexpected pipeline output type: {type(result).__name__}"
            raise TypeError(msg)
        return result

    @staticmethod
    def _failure_message(exc: BaseException) -> str:
        return f"{exc.__class__.__name__}: {exc}"

    async def _graph_task(self, request: IntegratedPipelineRequest) -> object | None:
        if not request.graph_input:
            return None
        return await asyncio.to_thread(
            graph_cache.get_or_set,
            stable_cache_key("graph", request.graph_input),
            lambda: RoadGraphAnalyzer().analyze(request.graph_input),
        )

    async def _risk_task(self, request: IntegratedPipelineRequest) -> object | None:
        if not request.risk_input:
            return None
        return await asyncio.to_thread(
            risk_cache.get_or_set,
            stable_cache_key("risk", request.risk_input),
            lambda: RiskScoringEngine().score(request.risk_input),
        )

    async def _rag_task(self, request: IntegratedPipelineRequest) -> object | None:
        if not request.rag_input:
            return None
        return await asyncio.to_thread(
            rag_cache.get_or_set,
            stable_cache_key("rag", request.rag_input),
            lambda: RagRetrievalService().retrieve(request.rag_input),
        )

    def _parallel_stage_statuses(
        self,
        request: IntegratedPipelineRequest,
        graph_output: GraphAnalysisResponse | None,
        risk_output: RiskScoringResponse | None,
        rag_output: RagRetrievalResponse | None,
        graph_result: object,
        risk_result: object,
        rag_result: object,
    ) -> list[PipelineStageStatus]:
        statuses: list[PipelineStageStatus] = []
        statuses.append(
            self._status(
                "graph_ai",
                self._stage_status(request.graph_input, graph_output, graph_result),
                self._stage_message(
                    request.graph_input,
                    graph_output,
                    graph_result,
                    "Road graph analysis completed or reused from cache.",
                    "No graph input provided.",
                ),
            )
        )
        statuses.append(
            self._status(
                "risk_engine",
                self._stage_status(request.risk_input, risk_output, risk_result),
                self._stage_message(
                    request.risk_input,
                    risk_output,
                    risk_result,
                    "Risk scoring completed or reused from cache.",
                    "No risk input provided.",
                ),
            )
        )
        rag_count = len(rag_output.contexts) if request.rag_input and rag_output else 0
        statuses.append(
            self._status(
                "rag",
                self._stage_status(request.rag_input, rag_output, rag_result),
                self._stage_message(
                    request.rag_input,
                    rag_output,
                    rag_result,
                    f"Retrieved {rag_count} grounding contexts or reused cached retrieval.",
                    "No RAG retrieval input provided.",
                ),
            )
        )
        return statuses

    @staticmethod
    def _stage_status(stage_input: object | None, stage_output: object | None, result: object) -> str:
        if isinstance(result, BaseException):
            return "failed"
        if stage_output:
            return "completed"
        return "skipped" if stage_input is None else "completed"

    def _stage_message(
        self,
        stage_input: object | None,
        stage_output: object | None,
        result: object,
        completed_message: str,
        skipped_message: str,
    ) -> str:
        if isinstance(result, BaseException):
            return self._failure_message(result)
        if stage_output:
            return completed_message
        return skipped_message if stage_input is None else completed_message
