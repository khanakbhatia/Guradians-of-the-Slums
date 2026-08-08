"""HTTP client used by IBM Bob MCP tools to call the AI FastAPI service."""

from __future__ import annotations

import json
import mimetypes
import os
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DEFAULT_AI_BASE_URL = "http://127.0.0.1:8001"
DEFAULT_TIMEOUT_SECONDS = 30.0


class BobFastAPIClientError(RuntimeError):
    """Raised when a Bob MCP tool cannot reach or use the FastAPI service."""


class BobFastAPIClient:
    """Small JSON HTTP client for existing M2-facing AI endpoints."""

    def __init__(self, base_url: str | None = None, timeout_seconds: float | None = None) -> None:
        self.base_url = (base_url or os.getenv("GUARDIANS_AI_BASE_URL") or DEFAULT_AI_BASE_URL).rstrip("/")
        self.timeout_seconds = float(
            timeout_seconds
            if timeout_seconds is not None
            else os.getenv("GUARDIANS_AI_TIMEOUT_SECONDS", DEFAULT_TIMEOUT_SECONDS)
        )

    def get_risk_score(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Call the existing POST /risk-score endpoint and return its JSON body."""

        return self._post_json("/risk-score", payload)

    def analyze_satellite_area(
        self,
        image_path: str,
        confidence_threshold: float = 0.25,
        west: float | None = None,
        south: float | None = None,
        east: float | None = None,
        north: float | None = None,
        model_name: str = "yolov8n.pt",
    ) -> dict[str, Any]:
        """Call the existing multipart POST /detect endpoint and return its JSON body."""

        image_file = Path(image_path)
        if not image_file.is_file():
            raise BobFastAPIClientError(f"Satellite image file does not exist: {image_path}")

        fields: dict[str, Any] = {
            "confidence_threshold": confidence_threshold,
            "model_name": model_name,
        }
        optional_geo_fields = {
            "west": west,
            "south": south,
            "east": east,
            "north": north,
        }
        fields.update({key: value for key, value in optional_geo_fields.items() if value is not None})
        return self._post_multipart("/detect", fields=fields, file_field="image", file_path=image_file)

    def generate_evacuation_plan(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Call the existing POST /evacuate endpoint and return its JSON body."""

        return self._post_json("/evacuate", payload)

    def assign_volunteers(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Call the existing POST /assign endpoint and return its JSON body."""

        return self._post_json("/assign", payload)

    def generate_grounded_report(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Call the existing RAG-grounded POST /report endpoint and return its JSON body."""

        return self._post_json("/report", payload)

    def _post_json(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        url = f"{self.base_url}{path}"
        body = json.dumps(payload).encode("utf-8")
        request = Request(
            url,
            data=body,
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            method="POST",
        )

        try:
            with urlopen(request, timeout=self.timeout_seconds) as response:
                response_body = response.read().decode("utf-8")
        except HTTPError as exc:
            error_body = exc.read().decode("utf-8", errors="replace")
            raise BobFastAPIClientError(
                f"FastAPI returned HTTP {exc.code} for {path}: {error_body}"
            ) from exc
        except URLError as exc:
            raise BobFastAPIClientError(
                f"FastAPI is unavailable at {self.base_url}; start the AI service on port 8001."
            ) from exc
        except TimeoutError as exc:
            raise BobFastAPIClientError(
                f"Timed out calling FastAPI {path} after {self.timeout_seconds:g} seconds."
            ) from exc

        try:
            parsed = json.loads(response_body)
        except json.JSONDecodeError as exc:
            raise BobFastAPIClientError(
                f"FastAPI returned non-JSON response for {path}: {response_body[:200]}"
            ) from exc

        if not isinstance(parsed, dict):
            raise BobFastAPIClientError(f"FastAPI returned an unexpected JSON type for {path}.")
        return parsed

    def _post_multipart(
        self,
        path: str,
        fields: dict[str, Any],
        file_field: str,
        file_path: Path,
    ) -> dict[str, Any]:
        boundary = "----guardians-bob-mcp-boundary"
        chunks: list[bytes] = []

        for name, value in fields.items():
            chunks.extend(
                [
                    f"--{boundary}\r\n".encode("utf-8"),
                    f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"),
                    f"{value}\r\n".encode("utf-8"),
                ]
            )

        content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        chunks.extend(
            [
                f"--{boundary}\r\n".encode("utf-8"),
                (
                    f'Content-Disposition: form-data; name="{file_field}"; '
                    f'filename="{file_path.name}"\r\n'
                ).encode("utf-8"),
                f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"),
                file_path.read_bytes(),
                b"\r\n",
                f"--{boundary}--\r\n".encode("utf-8"),
            ]
        )

        request = Request(
            f"{self.base_url}{path}",
            data=b"".join(chunks),
            headers={
                "Content-Type": f"multipart/form-data; boundary={boundary}",
                "Accept": "application/json",
            },
            method="POST",
        )
        return self._send_json_request(path, request)

    def _send_json_request(self, path: str, request: Request) -> dict[str, Any]:
        try:
            with urlopen(request, timeout=self.timeout_seconds) as response:
                response_body = response.read().decode("utf-8")
        except HTTPError as exc:
            error_body = exc.read().decode("utf-8", errors="replace")
            raise BobFastAPIClientError(
                f"FastAPI returned HTTP {exc.code} for {path}: {error_body}"
            ) from exc
        except URLError as exc:
            raise BobFastAPIClientError(
                f"FastAPI is unavailable at {self.base_url}; start the AI service on port 8001."
            ) from exc
        except TimeoutError as exc:
            raise BobFastAPIClientError(
                f"Timed out calling FastAPI {path} after {self.timeout_seconds:g} seconds."
            ) from exc

        try:
            parsed = json.loads(response_body)
        except json.JSONDecodeError as exc:
            raise BobFastAPIClientError(
                f"FastAPI returned non-JSON response for {path}: {response_body[:200]}"
            ) from exc

        if not isinstance(parsed, dict):
            raise BobFastAPIClientError(f"FastAPI returned an unexpected JSON type for {path}.")
        return parsed
