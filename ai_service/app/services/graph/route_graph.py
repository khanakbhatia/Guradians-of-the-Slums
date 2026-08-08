"""NetworkX evacuation route graph analysis."""

from __future__ import annotations

from math import atan2, cos, radians, sin, sqrt

import networkx as nx

from app.schemas.graph import (
    BlockedRoad,
    BuildingFootprint,
    BuildingRole,
    DrainageFeature,
    EvacuationBottleneck,
    GeoCoordinate,
    GraphAnalysisRequest,
    GraphAnalysisResponse,
    GraphEdge,
    GraphNode,
    RoadConnectivityGraph,
    RoadSegment,
    RoadStatus,
    SafePathRequest,
    ShortestSafePath,
)


class RoadGraphAnalyzer:
    """Build and analyze road connectivity graphs with NetworkX."""

    def analyze(self, request: GraphAnalysisRequest) -> GraphAnalysisResponse:
        """Generate graph, bottlenecks, blocked roads, and optional safe path."""

        graph = self._build_graph(request.roads, request.buildings, request.drainage)
        blocked_roads = self._find_blocked_roads(graph)
        bottlenecks = self._find_bottlenecks(graph)
        shortest_safe_path = (
            self._find_shortest_safe_path(graph, request.safe_path)
            if request.safe_path is not None
            else None
        )

        return GraphAnalysisResponse(
            graph=self._serialize_graph(graph),
            evacuation_bottlenecks=bottlenecks,
            blocked_roads=blocked_roads,
            shortest_safe_path=shortest_safe_path,
        )

    def _build_graph(
        self,
        roads: list[RoadSegment],
        buildings: list[BuildingFootprint],
        drainage: list[DrainageFeature],
    ) -> nx.Graph:
        graph = nx.Graph()

        for road in roads:
            segment_points = road.coordinates
            for start, end in zip(segment_points, segment_points[1:], strict=False):
                start_node_id = self._node_id(start)
                end_node_id = self._node_id(end)
                distance_m = self._distance_m(start, end)
                drainage_risk = self._nearest_drainage_risk(start, end, drainage)
                status = self._road_status(road, drainage_risk)
                safety_cost = self._safety_cost(distance_m, road, drainage_risk, status)
                edge_id = f"{road.road_id}:{start_node_id}:{end_node_id}"

                graph.add_node(start_node_id, coordinate=start)
                graph.add_node(end_node_id, coordinate=end)
                graph.add_edge(
                    start_node_id,
                    end_node_id,
                    edge_id=edge_id,
                    road_id=road.road_id,
                    distance_m=distance_m,
                    safety_cost=safety_cost,
                    status=status,
                    drainage_risk=drainage_risk,
                    debris_score=road.debris_score,
                    flood_depth_m=road.flood_depth_m or 0.0,
                    capacity_score=road.capacity_score,
                )

        self._attach_buildings(graph, buildings)
        return graph

    @staticmethod
    def _serialize_graph(graph: nx.Graph) -> RoadConnectivityGraph:
        nodes = [
            GraphNode(
                node_id=node_id,
                coordinate=data["coordinate"],
                degree=int(graph.degree[node_id]),
                nearby_building_count=int(data.get("nearby_building_count", 0)),
                occupancy_estimate=int(data.get("occupancy_estimate", 0)),
                shelter_count=int(data.get("shelter_count", 0)),
            )
            for node_id, data in graph.nodes(data=True)
        ]
        edges = [
            GraphEdge(
                edge_id=data["edge_id"],
                road_id=data["road_id"],
                from_node_id=start_node,
                to_node_id=end_node,
                distance_m=round(float(data["distance_m"]), 2),
                safety_cost=round(float(data["safety_cost"]), 2),
                status=data["status"],
            )
            for start_node, end_node, data in graph.edges(data=True)
        ]
        connected_components = [sorted(component) for component in nx.connected_components(graph)]
        isolated_node_ids = sorted(list(nx.isolates(graph)))
        return RoadConnectivityGraph(
            nodes=nodes,
            edges=edges,
            connected_components=connected_components,
            isolated_node_ids=isolated_node_ids,
        )

    @staticmethod
    def _find_blocked_roads(graph: nx.Graph) -> list[BlockedRoad]:
        blocked: list[BlockedRoad] = []
        for _, _, data in graph.edges(data=True):
            if data["status"] == RoadStatus.OPEN:
                continue

            reasons: list[str] = []
            if data["status"] == RoadStatus.BLOCKED:
                reasons.append("road marked blocked or unsafe")
            if data["flood_depth_m"] >= 0.3:
                reasons.append("flood depth exceeds safe pedestrian threshold")
            if data["debris_score"] >= 0.75:
                reasons.append("high debris score")
            if data["drainage_risk"] >= 0.8:
                reasons.append("near blocked or overflowing drainage")

            severity = max(
                float(data["debris_score"]),
                min(1.0, float(data["flood_depth_m"]) / 1.0),
                float(data["drainage_risk"]),
                0.65 if data["status"] == RoadStatus.BLOCKED else 0.4,
            )
            blocked.append(
                BlockedRoad(
                    road_id=data["road_id"],
                    edge_id=data["edge_id"],
                    reason=", ".join(reasons) or "road degraded",
                    severity=round(severity, 3),
                )
            )
        return blocked

    @staticmethod
    def _find_bottlenecks(graph: nx.Graph) -> list[EvacuationBottleneck]:
        bottlenecks: list[EvacuationBottleneck] = []
        if graph.number_of_nodes() == 0:
            return bottlenecks

        articulation_points = set(nx.articulation_points(graph))
        betweenness = nx.betweenness_centrality(graph, weight="safety_cost", normalized=True)

        for node_id in articulation_points:
            coordinate = graph.nodes[node_id]["coordinate"]
            score = max(0.5, float(betweenness.get(node_id, 0.0)))
            bottlenecks.append(
                EvacuationBottleneck(
                    bottleneck_id=f"node:{node_id}",
                    bottleneck_type="articulation_point",
                    node_id=node_id,
                    coordinate=coordinate,
                    score=round(score, 3),
                    reason="removing this junction disconnects part of the road network",
                )
            )

        for start_node, end_node in nx.bridges(graph):
            edge_data = graph.get_edge_data(start_node, end_node)
            if edge_data is None:
                continue
            coordinate = graph.nodes[start_node]["coordinate"]
            score = min(1.0, 0.5 + float(edge_data["safety_cost"]) / 5000)
            bottlenecks.append(
                EvacuationBottleneck(
                    bottleneck_id=f"road:{edge_data['edge_id']}",
                    bottleneck_type="bridge_edge",
                    road_id=edge_data["road_id"],
                    coordinate=coordinate,
                    score=round(score, 3),
                    reason="this road segment is the only connection between graph regions",
                )
            )

        return sorted(bottlenecks, key=lambda item: item.score, reverse=True)

    @staticmethod
    def _attach_buildings(graph: nx.Graph, buildings: list[BuildingFootprint]) -> None:
        if graph.number_of_nodes() == 0:
            return

        for node_id in graph.nodes:
            graph.nodes[node_id]["nearby_building_count"] = 0
            graph.nodes[node_id]["occupancy_estimate"] = 0
            graph.nodes[node_id]["shelter_count"] = 0

        for building in buildings:
            nearest_node = RoadGraphAnalyzer._nearest_node(graph, building.centroid)
            graph.nodes[nearest_node]["nearby_building_count"] += 1
            graph.nodes[nearest_node]["occupancy_estimate"] += building.occupancy_estimate or 0
            if building.role in {
                BuildingRole.SHELTER,
                BuildingRole.HOSPITAL,
                BuildingRole.SCHOOL,
                BuildingRole.COMMAND_CENTER,
            }:
                graph.nodes[nearest_node]["shelter_count"] += 1

    def _find_shortest_safe_path(
        self,
        graph: nx.Graph,
        request: SafePathRequest,
    ) -> ShortestSafePath:
        if graph.number_of_nodes() == 0:
            return ShortestSafePath(found=False, message="road graph is empty")

        origin_node = self._nearest_node(graph, request.origin)
        destination_node = self._nearest_node(graph, request.destination)
        safe_graph = graph.copy()
        if request.avoid_blocked_roads:
            blocked_edges = [
                (start, end)
                for start, end, data in safe_graph.edges(data=True)
                if data["status"] == RoadStatus.BLOCKED
            ]
            safe_graph.remove_edges_from(blocked_edges)

        try:
            node_ids = nx.shortest_path(
                safe_graph,
                source=origin_node,
                target=destination_node,
                weight="safety_cost",
            )
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return ShortestSafePath(
                found=False,
                node_ids=[],
                message="no safe path found between origin and destination",
            )

        road_ids: list[str] = []
        total_distance_m = 0.0
        total_safety_cost = 0.0
        for start_node, end_node in zip(node_ids, node_ids[1:], strict=False):
            edge_data = safe_graph.get_edge_data(start_node, end_node)
            if edge_data is None:
                continue
            road_ids.append(edge_data["road_id"])
            total_distance_m += float(edge_data["distance_m"])
            total_safety_cost += float(edge_data["safety_cost"])

        return ShortestSafePath(
            found=True,
            total_distance_m=round(total_distance_m, 2),
            total_safety_cost=round(total_safety_cost, 2),
            node_ids=node_ids,
            road_ids=road_ids,
            coordinates=[safe_graph.nodes[node_id]["coordinate"] for node_id in node_ids],
        )

    @staticmethod
    def _road_status(road: RoadSegment, drainage_risk: float) -> RoadStatus:
        if road.status == RoadStatus.BLOCKED:
            return RoadStatus.BLOCKED
        if (road.flood_depth_m or 0.0) >= 0.5 or road.debris_score >= 0.9 or drainage_risk >= 0.95:
            return RoadStatus.BLOCKED
        if road.status == RoadStatus.DEGRADED:
            return RoadStatus.DEGRADED
        if (road.flood_depth_m or 0.0) >= 0.2 or road.debris_score >= 0.5 or drainage_risk >= 0.6:
            return RoadStatus.DEGRADED
        return RoadStatus.OPEN

    @staticmethod
    def _safety_cost(
        distance_m: float,
        road: RoadSegment,
        drainage_risk: float,
        status: RoadStatus,
    ) -> float:
        penalty = 1.0
        penalty += road.debris_score * 3.0
        penalty += (road.flood_depth_m or 0.0) * 4.0
        penalty += drainage_risk * 2.0
        penalty += (1.0 - road.capacity_score) * 2.0
        if status == RoadStatus.DEGRADED:
            penalty += 2.0
        if status == RoadStatus.BLOCKED:
            penalty += 1000.0
        return distance_m * penalty

    @staticmethod
    def _nearest_drainage_risk(
        start: GeoCoordinate,
        end: GeoCoordinate,
        drainage: list[DrainageFeature],
    ) -> float:
        risk = 0.0
        midpoint = GeoCoordinate(
            longitude=(start.longitude + end.longitude) / 2,
            latitude=(start.latitude + end.latitude) / 2,
        )
        for feature in drainage:
            feature_risk = feature.overflow_risk
            if feature.blocked:
                feature_risk = max(feature_risk, 0.85)
            nearest_distance = min(
                RoadGraphAnalyzer._distance_m(midpoint, coordinate)
                for coordinate in feature.coordinates
            )
            if nearest_distance <= 30:
                risk = max(risk, feature_risk)
            elif nearest_distance <= 100:
                risk = max(risk, feature_risk * 0.5)
        return float(min(1.0, risk))

    @staticmethod
    def _nearest_node(graph: nx.Graph, coordinate: GeoCoordinate) -> str:
        return min(
            graph.nodes,
            key=lambda node_id: RoadGraphAnalyzer._distance_m(
                graph.nodes[node_id]["coordinate"],
                coordinate,
            ),
        )

    @staticmethod
    def _node_id(coordinate: GeoCoordinate) -> str:
        return f"{coordinate.latitude:.6f},{coordinate.longitude:.6f}"

    @staticmethod
    def _distance_m(first: GeoCoordinate, second: GeoCoordinate) -> float:
        radius_m = 6_371_000
        lat_1 = radians(first.latitude)
        lat_2 = radians(second.latitude)
        delta_lat = radians(second.latitude - first.latitude)
        delta_lon = radians(second.longitude - first.longitude)
        haversine = sin(delta_lat / 2) ** 2 + cos(lat_1) * cos(lat_2) * sin(delta_lon / 2) ** 2
        return 2 * radius_m * atan2(sqrt(haversine), sqrt(1 - haversine))
