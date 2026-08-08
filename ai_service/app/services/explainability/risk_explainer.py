"""Structured explainability for deterministic risk predictions."""

from __future__ import annotations

from app.schemas.graph import GraphAnalysisResponse
from app.schemas.risk import (
    RiskExplanation,
    RiskFeatureContribution,
    RiskType,
    VisualOverlay,
)
from app.schemas.vision import VisionAnalysisResponse, VisionClass


class RiskExplainer:
    """Create human-readable and overlay-ready explanations for risk scores."""

    def explain(
        self,
        risk_type: RiskType,
        score: float,
        confidence: float,
        contributions: list[RiskFeatureContribution],
        cv_output: VisionAnalysisResponse,
        road_graph: GraphAnalysisResponse,
    ) -> RiskExplanation:
        """Build a structured explanation for one risk prediction."""

        top_features = sorted(contributions, key=lambda item: item.contribution, reverse=True)[:3]
        why = self._why(risk_type, score, top_features)
        reasoning = self._reasoning(risk_type, top_features, confidence)

        return RiskExplanation(
            why=why,
            human_readable_reasoning=reasoning,
            confidence=confidence,
            feature_contributions=contributions,
            visual_overlays=self._visual_overlays(risk_type, cv_output, road_graph),
        )

    @staticmethod
    def _why(
        risk_type: RiskType,
        score: float,
        top_features: list[RiskFeatureContribution],
    ) -> str:
        if not top_features:
            return f"{risk_type.value.title()} risk is based on limited available signals."
        feature_names = ", ".join(feature.feature_name for feature in top_features)
        return (
            f"{risk_type.value.title()} risk score {score:.2f} is mainly driven by "
            f"{feature_names}."
        )

    @staticmethod
    def _reasoning(
        risk_type: RiskType,
        top_features: list[RiskFeatureContribution],
        confidence: float,
    ) -> str:
        if not top_features:
            return (
                f"The {risk_type.value} prediction has confidence {confidence:.2f}; "
                "more complete input data would improve reliability."
            )

        feature_sentences = " ".join(feature.explanation for feature in top_features)
        return (
            f"The {risk_type.value} prediction has confidence {confidence:.2f}. "
            f"{feature_sentences}"
        )

    @staticmethod
    def _visual_overlays(
        risk_type: RiskType,
        cv_output: VisionAnalysisResponse,
        road_graph: GraphAnalysisResponse,
    ) -> list[VisualOverlay]:
        overlays: list[VisualOverlay] = []
        overlays.extend(RiskExplainer._cv_overlays(risk_type, cv_output))
        overlays.extend(RiskExplainer._graph_overlays(risk_type, road_graph))
        return overlays

    @staticmethod
    def _cv_overlays(
        risk_type: RiskType,
        cv_output: VisionAnalysisResponse,
    ) -> list[VisualOverlay]:
        target_labels = {
            RiskType.FLOOD: {VisionClass.DRAINAGE, VisionClass.OPEN_SPACE, VisionClass.BUILDING},
            RiskType.FIRE: {VisionClass.BUILDING, VisionClass.ROOF_DENSITY, VisionClass.OPEN_SPACE},
            RiskType.OVERALL: {
                VisionClass.BUILDING,
                VisionClass.ROOF_DENSITY,
                VisionClass.ROAD,
                VisionClass.DRAINAGE,
                VisionClass.OPEN_SPACE,
            },
        }
        overlays: list[VisualOverlay] = []
        for index, detection in enumerate(cv_output.detections):
            if detection.label not in target_labels[risk_type]:
                continue
            overlays.append(
                VisualOverlay(
                    overlay_id=f"cv:{risk_type.value}:{index}",
                    overlay_type="bounding_box",
                    label=detection.label.value,
                    risk_type=risk_type,
                    severity=detection.confidence,
                    bounding_box=detection.bounding_box,
                    geo_coordinates=detection.geo_coordinates,
                    style=RiskExplainer._style(risk_type),
                )
            )
        return overlays[:100]

    @staticmethod
    def _graph_overlays(
        risk_type: RiskType,
        road_graph: GraphAnalysisResponse,
    ) -> list[VisualOverlay]:
        overlays: list[VisualOverlay] = []
        edge_lookup = {edge.edge_id: edge for edge in road_graph.graph.edges}

        for index, blocked_road in enumerate(road_graph.blocked_roads):
            edge = edge_lookup.get(blocked_road.edge_id)
            if edge is None:
                continue
            from_node = next(
                (node for node in road_graph.graph.nodes if node.node_id == edge.from_node_id),
                None,
            )
            to_node = next(
                (node for node in road_graph.graph.nodes if node.node_id == edge.to_node_id),
                None,
            )
            if from_node is None or to_node is None:
                continue
            overlays.append(
                VisualOverlay(
                    overlay_id=f"blocked-road:{index}",
                    overlay_type="path",
                    label="blocked_road",
                    risk_type=risk_type,
                    severity=blocked_road.severity,
                    path_coordinates=[
                        {
                            "longitude": from_node.coordinate.longitude,
                            "latitude": from_node.coordinate.latitude,
                        },
                        {
                            "longitude": to_node.coordinate.longitude,
                            "latitude": to_node.coordinate.latitude,
                        },
                    ],
                    style={"color": "#dc2626", "stroke_width": 4, "opacity": 0.85},
                )
            )

        for index, bottleneck in enumerate(road_graph.evacuation_bottlenecks):
            if bottleneck.coordinate is None:
                continue
            overlays.append(
                VisualOverlay(
                    overlay_id=f"bottleneck:{index}",
                    overlay_type="point",
                    label="evacuation_bottleneck",
                    risk_type=risk_type,
                    severity=min(1.0, bottleneck.score),
                    path_coordinates=[
                        {
                            "longitude": bottleneck.coordinate.longitude,
                            "latitude": bottleneck.coordinate.latitude,
                        }
                    ],
                    style={"color": "#f97316", "radius": 8, "opacity": 0.9},
                )
            )
        return overlays[:100]

    @staticmethod
    def _style(risk_type: RiskType) -> dict[str, str | float | int]:
        if risk_type == RiskType.FLOOD:
            return {"color": "#2563eb", "stroke_width": 2, "opacity": 0.75}
        if risk_type == RiskType.FIRE:
            return {"color": "#ef4444", "stroke_width": 2, "opacity": 0.75}
        return {"color": "#7c3aed", "stroke_width": 2, "opacity": 0.75}
