from app.pipelines.evaluation_pipeline import AIEvaluationPipeline
from app.schemas.evaluation import (
    DetectionBox,
    DetectionEvaluationCase,
    EvaluationRequest,
    RetrievalEvaluationCase,
)


def test_evaluation_pipeline_computes_detection_and_retrieval_metrics() -> None:
    request = EvaluationRequest(
        run_id="eval-1",
        detection_cases=[
            DetectionEvaluationCase(
                case_id="d1",
                predicted_boxes=[
                    DetectionBox(label="building", x_min=0, y_min=0, x_max=10, y_max=10)
                ],
                ground_truth_boxes=[
                    DetectionBox(label="building", x_min=0, y_min=0, x_max=10, y_max=10)
                ],
            )
        ],
        retrieval_cases=[
            RetrievalEvaluationCase(
                case_id="r1",
                retrieved_document_ids=["sop-1", "manual-2"],
                relevant_document_ids=["sop-1"],
                top_k=2,
            )
        ],
    )

    response = AIEvaluationPipeline().evaluate(request)

    assert response.overall_score > 0
    assert response.sections[0].name == "detection_accuracy"
