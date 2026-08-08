"""Modular deterministic risk scoring engine."""

from __future__ import annotations

from app.schemas.graph import RoadStatus
from app.schemas.risk import (
    RiskFeatureContribution,
    RiskLevel,
    RiskScore,
    RiskScoringRequest,
    RiskScoringResponse,
    RiskType,
)
from app.services.explainability.risk_explainer import RiskExplainer
from app.services.risk.feature_builder import RiskFeatureBuilder, RiskFeatures


RISK_ENGINE_VERSION = "deterministic-v1"


class RiskScoringEngine:
    """Score flood, fire, and overall risk without ML or Granite."""

    def __init__(self) -> None:
        self.feature_builder = RiskFeatureBuilder()
        self.explainer = RiskExplainer()

    def score(self, request: RiskScoringRequest) -> RiskScoringResponse:
        """Generate modular risk scores with structured explanations."""

        road_statuses = [edge.status for edge in request.road_graph.graph.edges]
        features = self.feature_builder.build(
            cv_output=request.cv_output,
            road_graph_statuses=road_statuses,
            bottleneck_count=len(request.road_graph.evacuation_bottlenecks),
            rainfall=request.rainfall,
            historical_floods=request.historical_floods,
        )

        flood_risk = self._score_flood(request, features)
        fire_risk = self._score_fire(request, features)
        overall_risk = self._score_overall(request, features, flood_risk, fire_risk)
        confidence_score = round(
            (flood_risk.confidence + fire_risk.confidence + overall_risk.confidence) / 3,
            3,
        )

        return RiskScoringResponse(
            area_id=request.area_id,
            flood_risk=flood_risk,
            fire_risk=fire_risk,
            overall_risk=overall_risk,
            confidence_score=confidence_score,
            model_version=RISK_ENGINE_VERSION,
        )

    def _score_flood(self, request: RiskScoringRequest, features: RiskFeatures) -> RiskScore:
        contributions = [
            self._contribution(
                "rainfall_24h",
                features.rainfall_24h_score,
                0.3,
                "increases",
                "higher 24-hour rainfall increases surface flooding likelihood",
            ),
            self._contribution(
                "rainfall_72h",
                features.rainfall_72h_score,
                0.15,
                "increases",
                "sustained 72-hour rainfall suggests saturated ground and drainage pressure",
            ),
            self._contribution(
                "drainage_count",
                min(1.0, features.drainage_count / 8),
                0.15,
                "increases",
                "detected drainage features indicate flood-sensitive water flow areas",
            ),
            self._contribution(
                "blocked_road_ratio",
                features.blocked_road_ratio,
                0.15,
                "increases",
                "blocked roads reduce evacuation and emergency access during flooding",
            ),
            self._contribution(
                "historical_flood_score",
                features.historical_flood_score,
                0.2,
                "increases",
                "past flood severity is a strong indicator of repeated exposure",
            ),
            self._contribution(
                "open_space_pressure",
                features.open_space_score,
                0.05,
                "increases",
                "limited open space can reduce temporary refuge and water absorption capacity",
            ),
        ]
        score = self._weighted_score(contributions)
        confidence = self._confidence(features, source_count=4)
        return self._risk_score(
            risk_type=RiskType.FLOOD,
            score=score,
            confidence=confidence,
            contributions=contributions,
            request=request,
        )

    def _score_fire(self, request: RiskScoringRequest, features: RiskFeatures) -> RiskScore:
        contributions = [
            self._contribution(
                "roof_density_score",
                features.roof_density_score,
                0.35,
                "increases",
                "dense roofs suggest tightly packed structures and easier fire spread",
            ),
            self._contribution(
                "building_count",
                min(1.0, features.building_count / 250),
                0.2,
                "increases",
                "more buildings increase exposed structures in the area",
            ),
            self._contribution(
                "blocked_road_ratio",
                features.blocked_road_ratio,
                0.2,
                "increases",
                "blocked roads slow firefighting access and evacuation",
            ),
            self._contribution(
                "bottleneck_count",
                min(1.0, features.bottleneck_count / 12),
                0.15,
                "increases",
                "network bottlenecks can trap movement during fast-moving incidents",
            ),
            self._contribution(
                "open_space_pressure",
                features.open_space_score,
                0.1,
                "increases",
                "fewer open spaces reduce firebreak and assembly options",
            ),
        ]
        score = self._weighted_score(contributions)
        confidence = self._confidence(features, source_count=3)
        return self._risk_score(
            risk_type=RiskType.FIRE,
            score=score,
            confidence=confidence,
            contributions=contributions,
            request=request,
        )

    def _score_overall(
        self,
        request: RiskScoringRequest,
        features: RiskFeatures,
        flood_risk: RiskScore,
        fire_risk: RiskScore,
    ) -> RiskScore:
        contributions = [
            self._contribution(
                "flood_risk",
                flood_risk.score,
                0.5,
                "increases",
                "flood risk contributes directly to overall disaster exposure",
            ),
            self._contribution(
                "fire_risk",
                fire_risk.score,
                0.35,
                "increases",
                "fire risk contributes directly to overall settlement vulnerability",
            ),
            self._contribution(
                "network_bottlenecks",
                min(1.0, features.bottleneck_count / 12),
                0.15,
                "increases",
                "evacuation bottlenecks increase operational response risk",
            ),
        ]
        score = self._weighted_score(contributions)
        confidence = round(
            min(
                1.0,
                (flood_risk.confidence * 0.5)
                + (fire_risk.confidence * 0.35)
                + (features.data_completeness_score * 0.15),
            ),
            3,
        )
        return self._risk_score(
            risk_type=RiskType.OVERALL,
            score=score,
            confidence=confidence,
            contributions=contributions,
            request=request,
        )

    def _risk_score(
        self,
        risk_type: RiskType,
        score: float,
        confidence: float,
        contributions: list[RiskFeatureContribution],
        request: RiskScoringRequest,
    ) -> RiskScore:
        return RiskScore(
            risk_type=risk_type,
            score=score,
            level=self._level(score),
            confidence=confidence,
            explanation=self.explainer.explain(
                risk_type=risk_type,
                score=score,
                confidence=confidence,
                contributions=contributions,
                cv_output=request.cv_output,
                road_graph=request.road_graph,
            ),
        )

    @staticmethod
    def _contribution(
        feature_name: str,
        value: float | int | str | bool | None,
        weight: float,
        direction: str,
        explanation: str,
    ) -> RiskFeatureContribution:
        numeric_value = float(value or 0.0) if isinstance(value, int | float | bool) else 0.0
        return RiskFeatureContribution(
            feature_name=feature_name,
            value=value,
            contribution=round(min(1.0, max(0.0, numeric_value)) * weight, 3),
            weight=weight,
            direction=direction,
            explanation=explanation,
        )

    @staticmethod
    def _weighted_score(contributions: list[RiskFeatureContribution]) -> float:
        return round(sum(item.contribution for item in contributions), 3)

    @staticmethod
    def _confidence(features: RiskFeatures, source_count: int) -> float:
        available_signals = [
            features.road_count > 0,
            features.building_count > 0,
            features.historical_event_count > 0,
            features.rainfall_24h_score >= 0,
        ]
        signal_strength = min(1.0, sum(available_signals) / max(source_count, 1))
        return round((features.data_completeness_score * 0.7) + (signal_strength * 0.3), 3)

    @staticmethod
    def _level(score: float) -> RiskLevel:
        if score >= 0.75:
            return RiskLevel.CRITICAL
        if score >= 0.55:
            return RiskLevel.HIGH
        if score >= 0.3:
            return RiskLevel.MODERATE
        return RiskLevel.LOW
