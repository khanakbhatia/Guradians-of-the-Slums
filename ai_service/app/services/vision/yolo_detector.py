"""Pretrained YOLOv8 detection wrapper.

This module intentionally uses pretrained weights only. It does not train,
fine-tune, or mutate model weights.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
from ultralytics import YOLO

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
    """Thin wrapper around a pretrained YOLOv8 model."""

    def __init__(self, model_name: str = DEFAULT_MODEL_NAME) -> None:
        self.model_name = model_name
        self.model = YOLO(model_name)

    def detect(self, image: np.ndarray, confidence_threshold: float) -> list[VisionDetection]:
        """Run pretrained YOLO inference and return supported detections."""

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
