"""Computer vision API endpoints."""

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.vision import VisionAnalysisResponse
from app.services.vision.cv_analyzer import ImageGeoReference, SatelliteVisionAnalyzer

router = APIRouter(prefix="/vision", tags=["vision"])


@router.post("/satellite/analyze", response_model=VisionAnalysisResponse)
async def analyze_satellite_image(
    image: UploadFile = File(...),
    confidence_threshold: float = Form(0.25),
    west: float | None = Form(None),
    south: float | None = Form(None),
    east: float | None = Form(None),
    north: float | None = Form(None),
    model_name: str = Form("yolov8n.pt"),
) -> VisionAnalysisResponse:
    """Analyze a satellite image using pretrained YOLO and OpenCV."""

    image_bytes = await image.read()
    geo_reference = _build_geo_reference(west=west, south=south, east=east, north=north)
    try:
        analyzer = SatelliteVisionAnalyzer(model_name=model_name)
        return analyzer.analyze_image_bytes(
            image_bytes=image_bytes,
            image_id=image.filename,
            confidence_threshold=confidence_threshold,
            geo_reference=geo_reference,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _build_geo_reference(
    west: float | None,
    south: float | None,
    east: float | None,
    north: float | None,
) -> ImageGeoReference | None:
    values = [west, south, east, north]
    if any(value is None for value in values):
        return None
    return ImageGeoReference(
        west=float(west),
        south=float(south),
        east=float(east),
        north=float(north),
    )
