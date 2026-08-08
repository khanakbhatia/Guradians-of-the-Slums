"""Granite workflow tools that bridge agents to existing service modules."""

from __future__ import annotations

import json

from app.schemas.granite import GraniteGenerationRequest
from app.schemas.rag import RagRetrievalRequest
from app.schemas.resource_allocation import ResourceAllocationRequest
from app.schemas.risk import RiskScoringRequest
from app.services.agents.resource_allocation_agent import ResourceAllocationAgent
from app.services.llm.granite_client import GraniteClient
from app.services.rag.retriever import RagRetrievalService
from app.services.risk.risk_engine import RiskScoringEngine


def rag_retrieval_tool(payload_json: str) -> str:
    """
    Retrieve grounded disaster-response context from the RAG index.

    Args:
        payload_json: JSON matching RagRetrievalRequest.
    """

    request = RagRetrievalRequest.model_validate_json(payload_json)
    response = RagRetrievalService().retrieve(request)
    return response.model_dump_json()


def grounded_granite_tool(payload_json: str) -> str:
    """
    Generate a grounded IBM Granite output after RAG retrieval.

    Args:
        payload_json: JSON matching GraniteGenerationRequest.
    """

    request = GraniteGenerationRequest.model_validate_json(payload_json)
    response = GraniteClient().generate(request)
    return response.model_dump_json()


def risk_scoring_tool(payload_json: str) -> str:
    """
    Score flood, fire, and overall risk from prepared AI outputs.

    Args:
        payload_json: JSON matching RiskScoringRequest.
    """

    request = RiskScoringRequest.model_validate_json(payload_json)
    response = RiskScoringEngine().score(request)
    return response.model_dump_json()


def graph_analysis_tool(payload_json: str) -> str:
    """
    Return graph-analysis guidance when road graph output is supplied.

    Args:
        payload_json: JSON containing road graph analysis output.
    """

    payload = json.loads(payload_json)
    return json.dumps(payload)


def resource_allocation_tool(payload_json: str) -> str:
    """
    Allocate emergency resources using deterministic explainable scoring.

    Args:
        payload_json: JSON matching ResourceAllocationRequest.
    """

    request = ResourceAllocationRequest.model_validate_json(payload_json)
    response = ResourceAllocationAgent().allocate(request)
    return response.model_dump_json()


def all_disaster_tools() -> dict[str, object]:
    """Return the tools shared by the Granite multi-agent workflow."""

    return {
        "rag_retrieval_tool": rag_retrieval_tool,
        "grounded_granite_tool": grounded_granite_tool,
        "risk_scoring_tool": risk_scoring_tool,
        "graph_analysis_tool": graph_analysis_tool,
        "resource_allocation_tool": resource_allocation_tool,
    }
