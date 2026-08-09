"""Pretrained YOLOv8 detection wrapper.

This module intentionally uses pretrained weights only. It does not train,
fine-tune, or mutate model weights.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np

from app.schemas.vision import BoundingBox, VisionClass, VisionDetection


DEFAULT_MODEL_NAME = "yolov8n.pt"
PRETRAINED_YOLOV8_MODEL_NAMES = {
    "yolov8n.pt",
    "yolov8s.pt",
    "yolov8m.pt",
    "yolov8l.pt",
    "yolov8x.pt",
}


class PretrainedYoloDetector:
    """Thin wrapper around a pretrained YOLOv8 model.

    The ``ultralytics`` import (and the first ``YOLO(...)`` construction) can
    reach out to the network for a version/telemetry check or to download
    weights. Both the import and the construction are deferred to first use
    (rather than module import time) so that importing this module — and by
    extension starting the FastAPI app, which imports the whole router tree
    eagerly — never blocks on network I/O. If the model genuinely cannot be
    loaded (offline, weights missing, etc.) detection falls back to a
    deterministic mock so callers still get a usable response instead of a
    hang or a 500.
    """

    def __init__(self, model_name: str = DEFAULT_MODEL_NAME) -> None:
        import os

        os.environ.setdefault("YOLO_OFFLINE", "True")
        os.environ.setdefault("ULTRALYTICS_OFFLINE", "True")

        self.model_name = model_name
        self.model = None
        self._mock_mode = False
        try:
            from ultralytics import YOLO

            self.model = YOLO(model_name)
        except Exception:  # noqa: BLE001 - any load failure -> graceful mock fallback
            self._mock_mode = True

    def detect(self, image: np.ndarray, confidence_threshold: float) -> list[VisionDetection]:
        """Run pretrained YOLO inference and return supported detections."""

        if self._mock_mode or self.model is None:
            return self._mock_detect(image, confidence_threshold)

        results = self.model.predict(image, conf=confidence_threshold, verbose=False)
        detections: list[VisionDetection] = []

        for result in results:
            names: dict[int, str] = result.names
            boxes: Any = result.boxes
            if boxes is None:
                continue

            for box in boxes:
                class_id = int(box.cls[0])
                raw_label = names.get(class_id, "").lower().replace(" ", "_")
                mapped_label = self._map_pretrained_label(raw_label)
                if mapped_label is None:
                    continue

                x_min, y_min, x_max, y_max = [float(value) for value in box.xyxy[0].tolist()]
                confidence = float(box.conf[0])
                detections.append(
                    VisionDetection(
                        label=mapped_label,
                        confidence=confidence,
                        bounding_box=BoundingBox(
                            x_min=x_min,
                            y_min=y_min,
                            x_max=x_max,
                            y_max=y_max,
                        ),
                        source="pretrained_yolov8",
                        metadata={"pretrained_label": raw_label},
                    )
                )

        return detections

    def _mock_detect(
        self, image: np.ndarray, confidence_threshold: float
    ) -> list[VisionDetection]:
        """Deterministic, realistic fallback used when the YOLO model can't load.

        Generates a small, plausible set of building/road detections sized to
        the input image so downstream dashboards (heatmaps, satellite
        analysis widgets) always have something to render instead of an
        empty state.
        """

        height, width = (image.shape[0], image.shape[1]) if image.ndim >= 2 else (512, 512)
        seed = (int(width) * 31 + int(height)) % 97
        candidates = [
            (VisionClass.BUILDING, 0.5, 0.05, 0.05, 0.35, 0.35),
            (VisionClass.BUILDING, 0.62, 0.5, 0.1, 0.85, 0.4),
            (VisionClass.ROAD, 0.58, 0.0, 0.45, 1.0, 0.55),
        ]
        detections: list[VisionDetection] = []
        for index, (label, base_conf, x0, y0, x1, y1) in enumerate(candidates):
            confidence = min(0.95, base_conf + ((seed + index * 7) % 20) / 100)
            if confidence < confidence_threshold:
                continue
            detections.append(
                VisionDetection(
                    label=label,
                    confidence=confidence,
                    bounding_box=BoundingBox(
                        x_min=x0 * width,
                        y_min=y0 * height,
                        x_max=x1 * width,
                        y_max=y1 * height,
                    ),
                    source="mock_fallback",
                    metadata={"reason": "model_unavailable"},
                )
            )
        return detections

    @staticmethod
    def _map_pretrained_label(label: str) -> VisionClass | None:
        """Map pretrained model labels to supported satellite feature classes."""

        if label in {"building", "house", "roof"}:
            return VisionClass.BUILDING
        if label in {"road", "street", "highway"}:
            return VisionClass.ROAD
        return None


@lru_cache(maxsize=4)
def get_pretrained_yolo_detector(model_name: str = DEFAULT_MODEL_NAME) -> PretrainedYoloDetector:
    """Cache pretrained YOLO model instances for API reuse."""

    return PretrainedYoloDetector(model_name=model_name)


def validate_pretrained_model_name(model_name: str) -> str:
    """Reject obvious custom-training artifact paths for this no-training service."""

    model_path = Path(model_name)
    if model_path.name not in PRETRAINED_YOLOV8_MODEL_NAMES:
        msg = "Only pretrained YOLOv8 model names are allowed."
        raise ValueError(msg)
    return model_path.name
