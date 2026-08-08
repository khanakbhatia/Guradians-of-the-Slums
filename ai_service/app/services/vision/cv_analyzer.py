"""Satellite image computer-vision analysis service."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

import cv2
import numpy as np
import rasterio
from rasterio.io import DatasetReader

from app.schemas.vision import (
    BoundingBox,
    GeoBoundingBox,
    GeoPoint,
    VisionAnalysisResponse,
    VisionClass,
    VisionDetection,
    VisionSummary,
)
from app.services.vision.yolo_detector import (
    DEFAULT_MODEL_NAME,
    get_pretrained_yolo_detector,
    validate_pretrained_model_name,
)


@dataclass(frozen=True)
class ImageGeoReference:
    """Optional image-space to geo-space reference."""

    west: float
    south: float
    east: float
    north: float


class SatelliteVisionAnalyzer:
    """Analyze satellite images for demo-ready built-environment features."""

    def __init__(self, model_name: str = DEFAULT_MODEL_NAME) -> None:
        self.model_name = validate_pretrained_model_name(model_name)

    def analyze_image_path(
        self,
        image_path: Path,
        confidence_threshold: float = 0.25,
        geo_reference: ImageGeoReference | None = None,
    ) -> VisionAnalysisResponse:
        """Analyze an image file and return JSON-ready detections."""

        image, raster_reference = self._read_image(image_path)
        return self.analyze_image_array(
            image=image,
            image_id=image_path.stem,
            confidence_threshold=confidence_threshold,
            geo_reference=geo_reference or raster_reference,
        )

    def analyze_image_bytes(
        self,
        image_bytes: bytes,
        image_id: str | None = None,
        confidence_threshold: float = 0.25,
        geo_reference: ImageGeoReference | None = None,
    ) -> VisionAnalysisResponse:
        """Analyze uploaded image bytes and return JSON-ready detections."""

        buffer = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
        if image is None:
            msg = "Unable to decode uploaded satellite image."
            raise ValueError(msg)

        return self.analyze_image_array(
            image=image,
            image_id=image_id or str(uuid4()),
            confidence_threshold=confidence_threshold,
            geo_reference=geo_reference,
        )

    def analyze_image_array(
        self,
        image: np.ndarray,
        image_id: str,
        confidence_threshold: float,
        geo_reference: ImageGeoReference | None,
    ) -> VisionAnalysisResponse:
        """Run pretrained YOLO and OpenCV feature extraction."""

        image_height, image_width = image.shape[:2]
        detections = get_pretrained_yolo_detector(self.model_name).detect(
            image=image,
            confidence_threshold=confidence_threshold,
        )
        detections.extend(self._detect_building_candidates(image))
        detections.extend(self._detect_roads(image))
        detections.extend(self._detect_drainage(image))
        detections.extend(self._detect_open_spaces(image))

        detections = self._deduplicate(detections)
        detections = [
            self._with_geo_coordinates(detection, image_width, image_height, geo_reference)
            for detection in detections
        ]

        roof_density_score = self._calculate_roof_density_score(detections, image_width, image_height)
        if roof_density_score > 0:
            detections.append(
                VisionDetection(
                    label=VisionClass.ROOF_DENSITY,
                    confidence=min(0.95, max(0.2, roof_density_score)),
                    bounding_box=BoundingBox(
                        x_min=0,
                        y_min=0,
                        x_max=float(image_width),
                        y_max=float(image_height),
                    ),
                    geo_coordinates=self._image_geo_box(image_width, image_height, geo_reference),
                    source="opencv_density_metric",
                    metadata={"roof_density_score": roof_density_score},
                )
            )

        return VisionAnalysisResponse(
            image_id=image_id,
            model_name=self.model_name,
            detections=detections,
            summary=VisionSummary(
                image_width=image_width,
                image_height=image_height,
                building_count=sum(1 for item in detections if item.label == VisionClass.BUILDING),
                road_count=sum(1 for item in detections if item.label == VisionClass.ROAD),
                drainage_count=sum(1 for item in detections if item.label == VisionClass.DRAINAGE),
                open_space_count=sum(1 for item in detections if item.label == VisionClass.OPEN_SPACE),
                roof_density_score=roof_density_score,
            ),
        )

    @staticmethod
    def _read_image(image_path: Path) -> tuple[np.ndarray, ImageGeoReference | None]:
        """Read common images or georeferenced rasters."""

        if image_path.suffix.lower() in {".tif", ".tiff"}:
            with rasterio.open(image_path) as dataset:
                return SatelliteVisionAnalyzer._read_raster(dataset)

        image = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
        if image is None:
            msg = f"Unable to read satellite image: {image_path}"
            raise ValueError(msg)
        return image, None

    @staticmethod
    def _read_raster(dataset: DatasetReader) -> tuple[np.ndarray, ImageGeoReference | None]:
        """Read a raster into an OpenCV-compatible RGB image."""

        band_count = min(dataset.count, 3)
        raster = dataset.read(indexes=list(range(1, band_count + 1)))
        raster = np.moveaxis(raster, 0, -1)
        if raster.shape[-1] == 1:
            raster = np.repeat(raster, 3, axis=-1)
        raster = cv2.normalize(raster, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        image = cv2.cvtColor(raster, cv2.COLOR_RGB2BGR)
        bounds = dataset.bounds
        reference = ImageGeoReference(
            west=float(bounds.left),
            south=float(bounds.bottom),
            east=float(bounds.right),
            north=float(bounds.top),
        )
        return image, reference

    @staticmethod
    def _detect_building_candidates(image: np.ndarray) -> list[VisionDetection]:
        """Detect rectangular roof-like candidates using OpenCV geometry."""

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 60, 160)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        image_area = image.shape[0] * image.shape[1]
        detections: list[VisionDetection] = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < max(80, image_area * 0.00005) or area > image_area * 0.05:
                continue

            x, y, width, height = cv2.boundingRect(contour)
            aspect_ratio = width / max(height, 1)
            rectangularity = area / max(width * height, 1)
            if 0.35 <= aspect_ratio <= 3.0 and rectangularity >= 0.35:
                confidence = float(min(0.78, 0.35 + rectangularity * 0.45))
                detections.append(
                    VisionDetection(
                        label=VisionClass.BUILDING,
                        confidence=confidence,
                        bounding_box=BoundingBox(
                            x_min=float(x),
                            y_min=float(y),
                            x_max=float(x + width),
                            y_max=float(y + height),
                        ),
                        source="opencv_roof_candidate",
                        metadata={"area_pixels": float(area), "rectangularity": float(rectangularity)},
                    )
                )

        return detections[:250]

    @staticmethod
    def _detect_roads(image: np.ndarray) -> list[VisionDetection]:
        """Detect elongated light linear regions as road candidates."""

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (11, 3))
        opened = cv2.morphologyEx(gray, cv2.MORPH_OPEN, kernel)
        _, threshold = cv2.threshold(opened, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        contours, _ = cv2.findContours(threshold, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        return SatelliteVisionAnalyzer._linear_detections(contours, VisionClass.ROAD, "opencv_linear_road")

    @staticmethod
    def _detect_drainage(image: np.ndarray) -> list[VisionDetection]:
        """Detect dark narrow linear regions as drainage candidates."""

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        inverted = cv2.bitwise_not(gray)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 3))
        opened = cv2.morphologyEx(inverted, cv2.MORPH_OPEN, kernel)
        _, threshold = cv2.threshold(opened, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        contours, _ = cv2.findContours(threshold, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        return SatelliteVisionAnalyzer._linear_detections(
            contours,
            VisionClass.DRAINAGE,
            "opencv_dark_linear_drainage",
            max_items=80,
        )

    @staticmethod
    def _detect_open_spaces(image: np.ndarray) -> list[VisionDetection]:
        """Detect low-edge, vegetation/soil-like contiguous open-space candidates."""

        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        saturation = hsv[:, :, 1]
        value = hsv[:, :, 2]
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 40, 120)
        low_edge = cv2.bitwise_not(cv2.dilate(edges, np.ones((5, 5), np.uint8)))
        mask = cv2.inRange(saturation, 20, 180)
        mask = cv2.bitwise_and(mask, cv2.inRange(value, 50, 230))
        mask = cv2.bitwise_and(mask, low_edge)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        image_area = image.shape[0] * image.shape[1]
        detections: list[VisionDetection] = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < image_area * 0.005:
                continue
            x, y, width, height = cv2.boundingRect(contour)
            detections.append(
                VisionDetection(
                    label=VisionClass.OPEN_SPACE,
                    confidence=float(min(0.82, 0.45 + area / image_area)),
                    bounding_box=BoundingBox(
                        x_min=float(x),
                        y_min=float(y),
                        x_max=float(x + width),
                        y_max=float(y + height),
                    ),
                    source="opencv_open_space_candidate",
                    metadata={"area_pixels": float(area)},
                )
            )
        return detections[:80]

    @staticmethod
    def _linear_detections(
        contours: tuple[np.ndarray, ...],
        label: VisionClass,
        source: str,
        max_items: int = 120,
    ) -> list[VisionDetection]:
        detections: list[VisionDetection] = []
        for contour in contours:
            area = cv2.contourArea(contour)
            x, y, width, height = cv2.boundingRect(contour)
            long_side = max(width, height)
            short_side = max(min(width, height), 1)
            elongation = long_side / short_side
            if area < 120 or elongation < 4.0:
                continue
            detections.append(
                VisionDetection(
                    label=label,
                    confidence=float(min(0.76, 0.35 + elongation / 20)),
                    bounding_box=BoundingBox(
                        x_min=float(x),
                        y_min=float(y),
                        x_max=float(x + width),
                        y_max=float(y + height),
                    ),
                    source=source,
                    metadata={"area_pixels": float(area), "elongation": float(elongation)},
                )
            )
        return detections[:max_items]

    @staticmethod
    def _deduplicate(detections: list[VisionDetection]) -> list[VisionDetection]:
        """Remove highly overlapping detections within the same class."""

        ordered = sorted(detections, key=lambda item: item.confidence, reverse=True)
        kept: list[VisionDetection] = []
        for detection in ordered:
            if all(
                detection.label != existing.label
                or SatelliteVisionAnalyzer._iou(detection.bounding_box, existing.bounding_box) < 0.65
                for existing in kept
            ):
                kept.append(detection)
        return kept

    @staticmethod
    def _iou(first: BoundingBox, second: BoundingBox) -> float:
        x_left = max(first.x_min, second.x_min)
        y_top = max(first.y_min, second.y_min)
        x_right = min(first.x_max, second.x_max)
        y_bottom = min(first.y_max, second.y_max)
        intersection = max(0.0, x_right - x_left) * max(0.0, y_bottom - y_top)
        first_area = max(0.0, first.x_max - first.x_min) * max(0.0, first.y_max - first.y_min)
        second_area = max(0.0, second.x_max - second.x_min) * max(0.0, second.y_max - second.y_min)
        return intersection / max(first_area + second_area - intersection, 1.0)

    @staticmethod
    def _calculate_roof_density_score(
        detections: list[VisionDetection],
        image_width: int,
        image_height: int,
    ) -> float:
        building_area = sum(
            (item.bounding_box.x_max - item.bounding_box.x_min)
            * (item.bounding_box.y_max - item.bounding_box.y_min)
            for item in detections
            if item.label == VisionClass.BUILDING
        )
        return float(min(1.0, building_area / max(image_width * image_height, 1)))

    @staticmethod
    def _with_geo_coordinates(
        detection: VisionDetection,
        image_width: int,
        image_height: int,
        geo_reference: ImageGeoReference | None,
    ) -> VisionDetection:
        detection.geo_coordinates = SatelliteVisionAnalyzer._bbox_geo_box(
            detection.bounding_box,
            image_width,
            image_height,
            geo_reference,
        )
        return detection

    @staticmethod
    def _image_geo_box(
        image_width: int,
        image_height: int,
        geo_reference: ImageGeoReference | None,
    ) -> GeoBoundingBox | None:
        return SatelliteVisionAnalyzer._bbox_geo_box(
            BoundingBox(x_min=0, y_min=0, x_max=float(image_width), y_max=float(image_height)),
            image_width,
            image_height,
            geo_reference,
        )

    @staticmethod
    def _bbox_geo_box(
        bbox: BoundingBox,
        image_width: int,
        image_height: int,
        geo_reference: ImageGeoReference | None,
    ) -> GeoBoundingBox | None:
        if geo_reference is None:
            return None

        def pixel_to_geo(x_value: float, y_value: float) -> GeoPoint:
            longitude = geo_reference.west + (x_value / image_width) * (
                geo_reference.east - geo_reference.west
            )
            latitude = geo_reference.north - (y_value / image_height) * (
                geo_reference.north - geo_reference.south
            )
            return GeoPoint(longitude=float(longitude), latitude=float(latitude))

        return GeoBoundingBox(
            north_west=pixel_to_geo(bbox.x_min, bbox.y_min),
            north_east=pixel_to_geo(bbox.x_max, bbox.y_min),
            south_east=pixel_to_geo(bbox.x_max, bbox.y_max),
            south_west=pixel_to_geo(bbox.x_min, bbox.y_max),
        )
