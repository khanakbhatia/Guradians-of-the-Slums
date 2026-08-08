"""IBM Bob MCP server for Guardians disaster-management tools."""

from typing import Any, Dict, Optional

from mcp.server.fastmcp import FastMCP

from app.integrations.bob_fastapi_client import (
    BobFastAPIClient,
    BobFastAPIClientError,
)

mcp = FastMCP("guardians-disaster-tools")


@mcp.tool()
def get_risk_score(request: Dict[str, Any]) -> Dict[str, Any]:
    """Return flood, fire, and overall risk scores."""
    try:
        return BobFastAPIClient().get_risk_score(request)
    except BobFastAPIClientError as exc:
        raise RuntimeError(str(exc))


@mcp.tool()
def analyze_satellite_area(
    image_path: str,
    confidence_threshold: float = 0.25,
    west: Optional[float] = None,
    south: Optional[float] = None,
    east: Optional[float] = None,
    north: Optional[float] = None,
    model_name: str = "yolov8n.pt",
) -> Dict[str, Any]:
    """Analyze a satellite image."""
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
        raise RuntimeError(str(exc))


@mcp.tool()
def generate_evacuation_plan(request: Dict[str, Any]) -> Dict[str, Any]:
    """Generate an evacuation plan."""
    try:
        return BobFastAPIClient().generate_evacuation_plan(request)
    except BobFastAPIClientError as exc:
        raise RuntimeError(str(exc))


@mcp.tool()
def assign_volunteers(request: Dict[str, Any]) -> Dict[str, Any]:
    """Assign volunteers."""
    try:
        return BobFastAPIClient().assign_volunteers(request)
    except BobFastAPIClientError as exc:
        raise RuntimeError(str(exc))


@mcp.tool()
def generate_grounded_report(request: Dict[str, Any]) -> Dict[str, Any]:
    """Generate a grounded report."""
    try:
        return BobFastAPIClient().generate_grounded_report(request)
    except BobFastAPIClientError as exc:
        raise RuntimeError(str(exc))


def main():
    mcp.run()


if __name__ == "__main__":
    main()