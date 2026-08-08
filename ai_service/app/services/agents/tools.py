"""BeeAI tools that bridge agents to existing FastAPI service modules."""

from __future__ import annotations

import json

from beeai_framework.tools import StringToolOutput, tool

from app.schemas.granite import GraniteGenerationRequest
from app.schemas.rag import RagRetrievalRequest
from app.schemas.resource_allocation import ResourceAllocationRequest
from app.schemas.risk import RiskScoringRequest
from app.services.agents.resource_allocation_agent import ResourceAllocationAgent
from app.services.llm.granite_client import GraniteClient
from app.services.rag.retriever import RagRetrievalService
from app.services.risk.risk_engine import RiskScoringEngine


@tool
def rag_retrieval_tool(payload_json: str) -> StringToolOutput:
    """
    Retrieve grounded disaster-response context from the RAG index.

    Args:
        payload_json: JSON matching RagRetrievalRequest.
    """

    request = RagRetrievalRequest.model_validate_json(payload_json)
    response = RagRetrievalService().retrieve(request)
    return StringToolOutput(response.model_dump_json())


@tool
def grounded_granite_tool(payload_json: str) -> StringToolOutput:
    """
    Generate a grounded Granite output after RAG retrieval.

    Args:
        payload_json: JSON matching GraniteGenerationRequest.
    """

    request = GraniteGenerationRequest.model_validate_json(payload_json)
    response = GraniteClient().generate(request)
    return StringToolOutput(response.model_dump_json())


@tool
def risk_scoring_tool(payload_json: str) -> StringToolOutput:
    """
    Score flood, fire, and overall risk from prepared AI outputs.

    Args:
        payload_json: JSON matching RiskScoringRequest.
    """

    request = RiskScoringRequest.model_validate_json(payload_json)
    response = RiskScoringEngine().score(request)
    return StringToolOutput(response.model_dump_json())


@tool
def graph_analysis_tool(payload_json: str) -> StringToolOutput:
    """
    Return graph-analysis guidance when road graph output is supplied.

    Args:
        payload_json: JSON containing road graph analysis output.
    """

    payload = json.loads(payload_json)
    return StringToolOutput(json.dumps(payload))


@tool
def resource_allocation_tool(payload_json: str) -> StringToolOutput:
    """
    Allocate emergency resources using deterministic explainable scoring.

    Args:
        payload_json: JSON matching ResourceAllocationRequest.
    """

    request = ResourceAllocationRequest.model_validate_json(payload_json)
    response = ResourceAllocationAgent().allocate(request)
    return StringToolOutput(response.model_dump_json())


def all_disaster_tools() -> list:
    """Return the BeeAI tools shared by the multi-agent workflow."""

    return [
        rag_retrieval_tool,
        grounded_granite_tool,
        risk_scoring_tool,
        graph_analysis_tool,
        resource_allocation_tool,
    ]
