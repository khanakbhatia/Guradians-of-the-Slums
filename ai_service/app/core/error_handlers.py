"""JSON error handlers for the AI service boundary."""

from __future__ import annotations

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse


def register_error_handlers(app: FastAPI) -> None:
    """Register stable JSON error envelopes for M2 consumers."""

    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": {
                    "type": exc.__class__.__name__,
                    "message": str(exc),
                    "path": request.url.path,
                }
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "type": exc.__class__.__name__,
                    "message": "AI service failed while processing the request.",
                    "path": request.url.path,
                }
            },
        )
