"""IBM Bob MCP server for Guardians disaster-management tools.

Phase 1 exposes only get_risk_score. The tool delegates to the existing FastAPI
service so the application keeps one source of truth for risk-scoring behavior.
"""

from __future__ import annotations

from typing import Any

from mcp.server.fastmcp import FastMCP

from app.integrations.bob_fastapi_client import BobFastAPIClient, BobFastAPIClientError


mcp = FastMCP("guardians-disaster-tools")


@mcp.tool()
def get_risk_score(request: dict[str, Any]) -> dict[str, Any]:
    """Return flood, fire, and overall risk scores for an existing RiskScoringRequest JSON body."""

    try:
        return BobFastAPIClient().get_risk_score(request)
    except BobFastAPIClientError as exc:
        raise RuntimeError(str(exc)) from exc


@mcp.tool()
def analyze_satellite_area(
    image_path: str,
    confidence_threshold: float = 0.25,
    west: float | None = None,
    south: float | None = None,
    east: float | None = None,
    north: float | None = None,
    model_name: str = "yolov8n.pt",
) -> dict[str, Any]:
    """Analyze a satellite image through the existing multipart POST /detect endpoint."""

    try:
        return BobFastAPIClient().analyze_satellite_area(
            image_path=image_path,
            confidence_threshold=confidence_threshold,
            west=west,
            south=south,
            east=east,
            north=north,
            model_name=model_name,
        )
    except BobFastAPIClientError as exc:
        raise RuntimeError(str(exc)) from exc


@mcp.tool()
def generate_evacuation_plan(request: dict[str, Any]) -> dict[str, Any]:
    """Generate an evacuation plan through the existing POST /evacuate endpoint."""

    try:
        return BobFastAPIClient().generate_evacuation_plan(request)
    except BobFastAPIClientError as exc:
        raise RuntimeError(str(exc)) from exc


@mcp.tool()
def assign_volunteers(request: dict[str, Any]) -> dict[str, Any]:
    """Rank volunteers through the existing POST /assign endpoint."""

    try:
        return BobFastAPIClient().assign_volunteers(request)
    except BobFastAPIClientError as exc:
        raise RuntimeError(str(exc)) from exc


@mcp.tool()
def generate_grounded_report(request: dict[str, Any]) -> dict[str, Any]:
    """Generate a RAG-grounded Granite report through the existing POST /report endpoint."""

    try:
        return BobFastAPIClient().generate_grounded_report(request)
    except BobFastAPIClientError as exc:
        raise RuntimeError(str(exc)) from exc


def main() -> None:
    """Run the local STDIO MCP server."""

    mcp.run()


if __name__ == "__main__":
    main()
