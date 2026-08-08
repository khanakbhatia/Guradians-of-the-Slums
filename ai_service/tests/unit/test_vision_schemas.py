from app.schemas.vision import BoundingBox, VisionClass, VisionDetection


def test_vision_detection_schema_accepts_supported_feature_class() -> None:
    detection = VisionDetection(
        label=VisionClass.BUILDING,
        confidence=0.8,
        bounding_box=BoundingBox(x_min=1, y_min=2, x_max=3, y_max=4),
        source="test",
    )

    assert detection.label == VisionClass.BUILDING
    assert detection.confidence == 0.8
