"""Deterministic feature engineering for risk scoring."""

from __future__ import annotations

from dataclasses import dataclass

from app.schemas.graph import RoadStatus
from app.schemas.risk import HistoricalFloodRecord, RainfallObservation
from app.schemas.vision import VisionAnalysisResponse, VisionClass


@dataclass(frozen=True)
class RiskFeatures:
    """Normalized features shared by modular risk scorers."""

    building_count: int
    roof_density_score: float
    road_count: int
    blocked_road_ratio: float
    bottleneck_count: int
    drainage_count: int
    rainfall_24h_score: float
    rainfall_72h_score: float
    rainfall_intensity_score: float
    historical_flood_score: float
    historical_event_count: int
    open_space_score: float
    data_completeness_score: float


class RiskFeatureBuilder:
    """Build normalized risk features from CV, graph, rainfall, and history."""

    def build(
        self,
        cv_output: VisionAnalysisResponse,
        road_graph_statuses: list[RoadStatus],
        bottleneck_count: int,
        rainfall: RainfallObservation,
        historical_floods: list[HistoricalFloodRecord],
    ) -> RiskFeatures:
        building_count = cv_output.summary.building_count
        roof_density_score = cv_output.summary.roof_density_score
        road_count = max(cv_output.summary.road_count, len(road_graph_statuses))
        blocked_count = sum(1 for status in road_graph_statuses if status == RoadStatus.BLOCKED)
        blocked_road_ratio = blocked_count / max(len(road_graph_statuses), 1)
        drainage_count = cv_output.summary.drainage_count
        open_space_count = cv_output.summary.open_space_count
        open_space_score = max(0.0, 1.0 - min(1.0, open_space_count / 10))
        historical_flood_score = self._historical_flood_score(historical_floods)

        present_inputs = [
            cv_output.summary.image_width > 0 and cv_output.summary.image_height > 0,
            len(road_graph_statuses) > 0,
            rainfall.rainfall_mm_24h >= 0,
            len(historical_floods) > 0,
        ]

        return RiskFeatures(
            building_count=building_count,
            roof_density_score=roof_density_score,
            road_count=road_count,
            blocked_road_ratio=blocked_road_ratio,
            bottleneck_count=bottleneck_count,
            drainage_count=drainage_count,
            rainfall_24h_score=min(1.0, rainfall.rainfall_mm_24h / 150),
            rainfall_72h_score=min(1.0, rainfall.rainfall_mm_72h / 300),
            rainfall_intensity_score=min(1.0, rainfall.rainfall_intensity_mm_per_hr / 60),
            historical_flood_score=historical_flood_score,
            historical_event_count=len(historical_floods),
            open_space_score=open_space_score,
            data_completeness_score=sum(present_inputs) / len(present_inputs),
        )

    @staticmethod
    def _historical_flood_score(historical_floods: list[HistoricalFloodRecord]) -> float:
        if not historical_floods:
            return 0.0

        weighted_scores: list[float] = []
        for record in historical_floods:
            recency_weight = 1.0
            if record.years_ago is not None:
                recency_weight = max(0.25, 1.0 - min(record.years_ago, 20) / 25)
            depth_score = min(1.0, (record.flood_depth_m or 0.0) / 2.0)
            impact_score = min(1.0, ((record.affected_buildings or 0) / 500))
            weighted_scores.append(
                max(record.severity_score, depth_score, impact_score) * recency_weight
            )
        return min(1.0, sum(weighted_scores) / len(weighted_scores))
