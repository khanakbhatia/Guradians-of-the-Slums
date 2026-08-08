from app.schemas.integration import IntegratedPipelineRequest


def test_integrated_pipeline_request_accepts_minimal_payload() -> None:
    request = IntegratedPipelineRequest(pipeline_id="pipe-1")

    assert request.pipeline_id == "pipe-1"
