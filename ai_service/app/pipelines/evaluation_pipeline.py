"""Evaluation pipeline for AI service quality metrics."""

from __future__ import annotations

from statistics import mean, median

from app.schemas.evaluation import (
    ConfidenceEvaluationCase,
    DetectionBox,
    DetectionEvaluationCase,
    EvaluationMetric,
    EvaluationRequest,
    EvaluationResponse,
    EvaluationSection,
    GraniteEvaluationCase,
    LatencySample,
    RetrievalEvaluationCase,
    RiskEvaluationCase,
)


EVALUATION_METHOD = "deterministic_ai_quality_evaluation_v1"


class AIEvaluationPipeline:
    """Compute deterministic evaluation metrics from benchmark cases."""

    def evaluate(self, request: EvaluationRequest) -> EvaluationResponse:
        """Generate an evaluation report for the AI service."""

        sections = [
            self._detection_section(request.detection_cases),
            self._risk_section(request.risk_cases),
            self._retrieval_section(request.retrieval_cases),
            self._granite_section(request.granite_cases),
            self._latency_section(request.latency_samples),
            self._confidence_section(request.confidence_cases),
        ]
        populated_scores = [
            metric.value
            for section in sections
            for metric in section.metrics
            if metric.name in self._score_metrics()
        ]
        overall_score = round(mean(populated_scores), 3) if populated_scores else 0.0
        return EvaluationResponse(
            run_id=request.run_id,
            sections=sections,
            overall_score=overall_score,
            summary=self._summary(overall_score, sections),
            evaluation_method=EVALUATION_METHOD,
        )

    @staticmethod
    def _detection_section(cases: list[DetectionEvaluationCase]) -> EvaluationSection:
        true_positive = 0
        false_positive = 0
        false_negative = 0
        confidence_values: list[float] = []

        for case in cases:
            matched_truth: set[int] = set()
            for prediction in case.predicted_boxes:
                confidence_values.append(prediction.confidence)
                match_index = AIEvaluationPipeline._best_detection_match(
                    prediction,
                    case.ground_truth_boxes,
                    matched_truth,
                    case.iou_threshold,
                )
                if match_index is None:
                    false_positive += 1
                else:
                    true_positive += 1
                    matched_truth.add(match_index)
            false_negative += len(case.ground_truth_boxes) - len(matched_truth)

        precision = true_positive / max(true_positive + false_positive, 1)
        recall = true_positive / max(true_positive + false_negative, 1)
        f1 = AIEvaluationPipeline._f1(precision, recall)
        avg_confidence = mean(confidence_values) if confidence_values else 0.0

        return EvaluationSection(
            name="detection_accuracy",
            metrics=[
                AIEvaluationPipeline._metric("precision", precision, 0.7),
                AIEvaluationPipeline._metric("recall", recall, 0.7),
                AIEvaluationPipeline._metric("f1", f1, 0.7),
                AIEvaluationPipeline._metric("average_detection_confidence", avg_confidence),
            ],
        )

    @staticmethod
    def _risk_section(cases: list[RiskEvaluationCase]) -> EvaluationSection:
        if not cases:
            return EvaluationSection(name="risk_accuracy", metrics=[])

        absolute_errors = [abs(case.predicted_score - case.actual_score) for case in cases]
        mae = mean(absolute_errors)
        score_accuracy = max(0.0, 1.0 - mae)
        level_accuracy = mean(
            1.0 if case.predicted_level == case.actual_level else 0.0 for case in cases
        )
        calibration_error = mean(
            abs(case.confidence - (1.0 - abs(case.predicted_score - case.actual_score)))
            for case in cases
        )

        return EvaluationSection(
            name="risk_accuracy",
            metrics=[
                AIEvaluationPipeline._metric("mean_absolute_error", mae, details={"lower_is_better": True}),
                AIEvaluationPipeline._metric("score_accuracy", score_accuracy, 0.75),
                AIEvaluationPipeline._metric("risk_level_accuracy", level_accuracy, 0.75),
                AIEvaluationPipeline._metric(
                    "risk_confidence_calibration",
                    max(0.0, 1.0 - calibration_error),
                    0.7,
                ),
            ],
        )

    @staticmethod
    def _retrieval_section(cases: list[RetrievalEvaluationCase]) -> EvaluationSection:
        if not cases:
            return EvaluationSection(name="retrieval_quality", metrics=[])

        precision_values: list[float] = []
        recall_values: list[float] = []
        reciprocal_ranks: list[float] = []

        for case in cases:
            retrieved = case.retrieved_document_ids[: case.top_k]
            relevant = set(case.relevant_document_ids)
            hits = [document_id for document_id in retrieved if document_id in relevant]
            precision_values.append(len(hits) / max(len(retrieved), 1))
            recall_values.append(len(hits) / max(len(relevant), 1))
            reciprocal_ranks.append(AIEvaluationPipeline._reciprocal_rank(retrieved, relevant))

        return EvaluationSection(
            name="retrieval_quality",
            metrics=[
                AIEvaluationPipeline._metric("precision_at_k", mean(precision_values), 0.7),
                AIEvaluationPipeline._metric("recall_at_k", mean(recall_values), 0.7),
                AIEvaluationPipeline._metric("mean_reciprocal_rank", mean(reciprocal_ranks), 0.7),
            ],
        )

    @staticmethod
    def _granite_section(cases: list[GraniteEvaluationCase]) -> EvaluationSection:
        if not cases:
            return EvaluationSection(name="granite_response_quality", metrics=[])

        grounded_rate = mean(1.0 if case.grounded else 0.0 for case in cases)
        citation_coverage = mean(
            AIEvaluationPipeline._citation_coverage(case) for case in cases
        )
        answer_completeness = mean(
            1.0 if case.generated_text.strip() and "Not available in retrieved sources" not in case.generated_text
            else 0.5 if case.generated_text.strip()
            else 0.0
            for case in cases
        )
        avg_confidence = mean(case.confidence for case in cases)

        return EvaluationSection(
            name="granite_response_quality",
            metrics=[
                AIEvaluationPipeline._metric("grounded_response_rate", grounded_rate, 1.0),
                AIEvaluationPipeline._metric("citation_coverage", citation_coverage, 0.8),
                AIEvaluationPipeline._metric("answer_completeness", answer_completeness, 0.7),
                AIEvaluationPipeline._metric("average_granite_confidence", avg_confidence),
            ],
        )

    @staticmethod
    def _latency_section(samples: list[LatencySample]) -> EvaluationSection:
        if not samples:
            return EvaluationSection(name="latency", metrics=[])

        values = sorted(sample.latency_ms for sample in samples)
        avg_latency = mean(values)
        p50 = median(values)
        p95 = AIEvaluationPipeline._percentile(values, 0.95)
        score = max(0.0, min(1.0, 1.0 - (p95 / 10_000)))

        return EvaluationSection(
            name="latency",
            metrics=[
                EvaluationMetric(name="average_latency_ms", value=round(avg_latency, 3)),
                EvaluationMetric(name="p50_latency_ms", value=round(p50, 3)),
                EvaluationMetric(name="p95_latency_ms", value=round(p95, 3)),
                AIEvaluationPipeline._metric("latency_score", score, 0.7),
            ],
        )

    @staticmethod
    def _confidence_section(cases: list[ConfidenceEvaluationCase]) -> EvaluationSection:
        if not cases:
            return EvaluationSection(name="confidence", metrics=[])

        brier = mean((case.confidence - (1.0 if case.correct else 0.0)) ** 2 for case in cases)
        calibration_score = max(0.0, 1.0 - brier)
        avg_confidence = mean(case.confidence for case in cases)
        empirical_accuracy = mean(1.0 if case.correct else 0.0 for case in cases)

        return EvaluationSection(
            name="confidence",
            metrics=[
                AIEvaluationPipeline._metric("confidence_calibration_score", calibration_score, 0.75),
                EvaluationMetric(name="brier_score", value=round(brier, 3), details={"lower_is_better": True}),
                EvaluationMetric(name="average_confidence", value=round(avg_confidence, 3)),
                EvaluationMetric(name="empirical_accuracy", value=round(empirical_accuracy, 3)),
            ],
        )

    @staticmethod
    def _best_detection_match(
        prediction: DetectionBox,
        truth_boxes: list[DetectionBox],
        matched_truth: set[int],
        threshold: float,
    ) -> int | None:
        best_index: int | None = None
        best_iou = 0.0
        for index, truth in enumerate(truth_boxes):
            if index in matched_truth or prediction.label != truth.label:
                continue
            iou = AIEvaluationPipeline._iou(prediction, truth)
            if iou >= threshold and iou > best_iou:
                best_iou = iou
                best_index = index
        return best_index

    @staticmethod
    def _iou(first: DetectionBox, second: DetectionBox) -> float:
        x_left = max(first.x_min, second.x_min)
        y_top = max(first.y_min, second.y_min)
        x_right = min(first.x_max, second.x_max)
        y_bottom = min(first.y_max, second.y_max)
        intersection = max(0.0, x_right - x_left) * max(0.0, y_bottom - y_top)
        first_area = max(0.0, first.x_max - first.x_min) * max(0.0, first.y_max - first.y_min)
        second_area = max(0.0, second.x_max - second.x_min) * max(0.0, second.y_max - second.y_min)
        return intersection / max(first_area + second_area - intersection, 1.0)

    @staticmethod
    def _citation_coverage(case: GraniteEvaluationCase) -> float:
        if not case.required_citation_ids:
            return 1.0 if case.citation_ids else 0.0
        return len(set(case.citation_ids) & set(case.required_citation_ids)) / len(
            set(case.required_citation_ids)
        )

    @staticmethod
    def _reciprocal_rank(retrieved: list[str], relevant: set[str]) -> float:
        for index, document_id in enumerate(retrieved, start=1):
            if document_id in relevant:
                return 1.0 / index
        return 0.0

    @staticmethod
    def _f1(precision: float, recall: float) -> float:
        if precision + recall == 0:
            return 0.0
        return 2 * precision * recall / (precision + recall)

    @staticmethod
    def _percentile(values: list[float], percentile: float) -> float:
        if not values:
            return 0.0
        index = min(len(values) - 1, round((len(values) - 1) * percentile))
        return values[index]

    @staticmethod
    def _metric(
        name: str,
        value: float,
        target: float | None = None,
        details: dict[str, float | int | str | bool | None] | None = None,
    ) -> EvaluationMetric:
        rounded = round(value, 3)
        return EvaluationMetric(
            name=name,
            value=rounded,
            target=target,
            passed=rounded >= target if target is not None else None,
            details=details or {},
        )

    @staticmethod
    def _score_metrics() -> set[str]:
        return {
            "f1",
            "score_accuracy",
            "risk_level_accuracy",
            "risk_confidence_calibration",
            "precision_at_k",
            "recall_at_k",
            "mean_reciprocal_rank",
            "grounded_response_rate",
            "citation_coverage",
            "answer_completeness",
            "latency_score",
            "confidence_calibration_score",
        }

    @staticmethod
    def _summary(overall_score: float, sections: list[EvaluationSection]) -> str:
        populated = [section.name for section in sections if section.metrics]
        if not populated:
            return "No evaluation cases were provided."
        return (
            f"Evaluation completed for {', '.join(populated)}. "
            f"Overall score: {overall_score:.3f}."
        )
