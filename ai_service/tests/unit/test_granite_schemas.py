from app.schemas.granite import GraniteGenerationRequest, GraniteOutputType


def test_granite_generation_request_supports_multilingual_alerts() -> None:
    request = GraniteGenerationRequest(
        output_type=GraniteOutputType.MULTILINGUAL_ALERT,
        incident_context="Flooding reported near low-lying homes.",
        target_languages=["English", "Hindi"],
    )

    assert request.output_type == GraniteOutputType.MULTILINGUAL_ALERT
    assert request.target_languages == ["English", "Hindi"]
