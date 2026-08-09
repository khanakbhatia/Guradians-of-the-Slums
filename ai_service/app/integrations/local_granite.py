"""Local IBM Granite runtime integration.

The application uses IBM Granite for generated text. This adapter targets a
local Ollama-compatible Granite runtime by default and never fabricates output
when the model server is unavailable.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any


class GraniteRuntimeError(RuntimeError):
    """Raised when local Granite inference cannot be completed."""


@dataclass(frozen=True)
class LocalGraniteRequest:
    """Prompt request sent to the local Granite runtime."""

    prompt: str
    task_type: str
    num_predict: int = 700
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class LocalGraniteResponse:
    """Normalized local Granite response."""

    text: str
    model_id: str
    raw_response: dict[str, Any] = field(default_factory=dict)


class LocalGraniteClient:
    """HTTP client for local Granite inference."""

    def __init__(self) -> None:
        self.base_url = os.getenv("GRANITE_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
        self.model_id = os.getenv("GRANITE_MODEL", "ibm/granite4:latest")
        self.timeout_seconds = float(os.getenv("GRANITE_TIMEOUT_SECONDS", "60"))

    def generate(self, request: LocalGraniteRequest) -> LocalGraniteResponse:
        """Generate text from a local Granite model server."""

        payload = {
            "model": self.model_id,
            "prompt": request.prompt,
            "stream": False,
            "options": {
                "temperature": 0,
                "num_predict": request.num_predict,
            },
            "metadata": {
                "task_type": request.task_type,
                **request.metadata,
            },
        }
        http_request = urllib.request.Request(
            f"{self.base_url}/api/generate",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(http_request, timeout=self.timeout_seconds) as response:
                response_body = response.read().decode("utf-8")
        except TimeoutError as exc:
            # ROOT CAUSE of the reported 500: urlopen's `timeout=` only
            # covers the connect phase reliably; a slow/hung local model
            # generating a long response can time out on the READ phase
            # (response.read()) instead, which raises a bare TimeoutError
            # (socket.timeout is a TimeoutError alias in Python 3.10+) -
            # NOT urllib.error.URLError. That was never caught here, so it
            # propagated all the way up as an unhandled exception and
            # FastAPI's generic handler turned it into an HTTP 500.
            msg = (
                f"Local Granite request to {self.base_url} timed out after "
                f"{self.timeout_seconds}s (model {self.model_id})."
            )
            raise GraniteRuntimeError(msg) from exc
        except urllib.error.URLError as exc:
            msg = (
                "Local Granite runtime is unavailable. Start an Ollama-compatible "
                f"Granite server at {self.base_url} with model {self.model_id}."
            )
            raise GraniteRuntimeError(msg) from exc
        except Exception as exc:  # noqa: BLE001 - defensive: any other transport failure
            # Belt-and-suspenders: whatever else urllib/http.client can throw
            # (ConnectionResetError, http.client.HTTPException, etc.) must
            # still come out as GraniteRuntimeError, never as a bare
            # exception that becomes an unhandled 500.
            msg = f"Local Granite request to {self.base_url} failed unexpectedly: {exc}"
            raise GraniteRuntimeError(msg) from exc

        return self._normalize_response(response_body)

    def _normalize_response(self, response_body: str) -> LocalGraniteResponse:
        response_body = response_body.strip()
        if not response_body:
            msg = "Local Granite returned an empty response."
            raise GraniteRuntimeError(msg)

        try:
            payload = json.loads(response_body)
        except json.JSONDecodeError as exc:
            msg = "Local Granite returned non-JSON output."
            raise GraniteRuntimeError(msg) from exc

        text = str(payload.get("response") or payload.get("text") or "").strip()
        if not text:
            msg = "Local Granite response did not contain generated text."
            raise GraniteRuntimeError(msg)
        model_id = str(payload.get("model") or self.model_id)
        return LocalGraniteResponse(text=text, model_id=model_id, raw_response=payload)
