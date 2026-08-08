# AI Evaluation Pipeline

Backend-only evaluation for the M3 AI service.

## Endpoint

```text
POST /api/v1/evaluation/run
```

## Metrics

- Detection accuracy: precision, recall, F1, average confidence
- Risk accuracy: MAE, score accuracy, level accuracy, confidence calibration
- Retrieval quality: precision@k, recall@k, mean reciprocal rank
- IBM Granite response quality: grounded response rate, citation coverage, answer completeness
- Latency: average, p50, p95, latency score
- Confidence: Brier score, calibration score, empirical accuracy

## Design

The pipeline is data-driven. It accepts predictions plus reference labels or expected outputs and returns structured JSON metrics. It does not execute models, call IBM Granite, render UI, or mutate production data.
