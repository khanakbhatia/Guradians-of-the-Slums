"""FastAPI application assembly."""

from fastapi import FastAPI

from app.api.m2_facade import router as m2_facade_router
from app.api.v1.agents import router as agents_router
from app.api.v1.evacuation import router as evacuation_router
from app.api.v1.evaluation import router as evaluation_router
from app.api.v1.explainability import router as explainability_router
from app.api.v1.graph import router as graph_router
from app.api.v1.granite import router as granite_router
from app.api.v1.pipeline import router as pipeline_router
from app.api.v1.rag import router as rag_router
from app.api.v1.risk import router as risk_router
from app.api.v1.vision import router as vision_router
from app.api.v1.volunteers import router as volunteers_router
from app.core.error_handlers import register_error_handlers


app = FastAPI(
    title="Guardians of the Slums AI Service",
    version="0.1.0",
)

register_error_handlers(app)

app.include_router(m2_facade_router)
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
