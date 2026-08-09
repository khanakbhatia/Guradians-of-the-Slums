"""FastAPI application assembly."""

import os
from pathlib import Path

from fastapi import FastAPI


def _load_dotenv(path: Path) -> None:
    """Minimal .env loader (no python-dotenv dependency).

    Populates os.environ from a simple KEY=VALUE file, without overriding
    any variable the process environment already defines. This runs before
    any app modules that read os.getenv(...) at construction time, so
    GRANITE_BASE_URL / GRANITE_MODEL / FAISS_INDEX_PATH / etc. from .env are
    actually honored instead of silently falling back to hardcoded defaults.
    """

    if not path.is_file():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from app.api.m2_facade import router as m2_facade_router  # noqa: E402
from app.api.v1.agents import router as agents_router  # noqa: E402
from app.api.v1.evacuation import router as evacuation_router  # noqa: E402
from app.api.v1.evaluation import router as evaluation_router  # noqa: E402
from app.api.v1.explainability import router as explainability_router  # noqa: E402
from app.api.v1.graph import router as graph_router  # noqa: E402
from app.api.v1.granite import router as granite_router  # noqa: E402
from app.api.v1.health import router as health_router  # noqa: E402
from app.api.v1.pipeline import router as pipeline_router  # noqa: E402
from app.api.v1.rag import router as rag_router  # noqa: E402
from app.api.v1.risk import router as risk_router  # noqa: E402
from app.api.v1.vision import router as vision_router  # noqa: E402
from app.api.v1.volunteers import router as volunteers_router  # noqa: E402
from app.core.error_handlers import register_error_handlers  # noqa: E402


app = FastAPI(
    title="Guardians of the Slums AI Service",
    version="0.1.0",
)

register_error_handlers(app)

app.include_router(m2_facade_router)
app.include_router(health_router, prefix="/api/v1")
app.include_router(agents_router, prefix="/api/v1")
app.include_router(evacuation_router, prefix="/api/v1")
app.include_router(evaluation_router, prefix="/api/v1")
app.include_router(explainability_router, prefix="/api/v1")
app.include_router(graph_router, prefix="/api/v1")
app.include_router(granite_router, prefix="/api/v1")
app.include_router(pipeline_router, prefix="/api/v1")
app.include_router(rag_router, prefix="/api/v1")
app.include_router(risk_router, prefix="/api/v1")
app.include_router(vision_router, prefix="/api/v1")
app.include_router(volunteers_router, prefix="/api/v1")


@app.get("/health", tags=["health"])
def root_health() -> dict[str, str]:
    """Unprefixed liveness probe, mirrors /api/v1/health."""

    return {"status": "ok"}
