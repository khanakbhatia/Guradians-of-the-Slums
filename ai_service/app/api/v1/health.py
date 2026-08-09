"""Service health API boundary."""

from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
def get_health() -> dict[str, str]:
    """Lightweight liveness probe.

    Intentionally does not touch Ollama/Granite, MCP, or any datastore so it
    can never hang or fail due to those dependencies being unavailable -
    callers (Bob MCP, the Node backend, uptime checks) can use this to
    confirm the process itself is up before probing heavier endpoints.
    """

    return {"status": "ok", "service": "guardians-ai-service"}
