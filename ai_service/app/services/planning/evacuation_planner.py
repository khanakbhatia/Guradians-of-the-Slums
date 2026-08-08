"""Deterministic NetworkX evacuation planner."""

from __future__ import annotations

from math import atan2, cos, radians, sin, sqrt

import networkx as nx

from app.schemas.evacuation import (
    EvacuationPlanningRequest,
    EvacuationPlanningResponse,
    EvacuationPriority,
    EvacuationRoute,
    RiskZone,
    Shelter,
    ShelterStatus,
)
from app.schemas.graph import GeoCoordinate, RoadStatus


PLANNING_METHOD = "deterministic_networkx_safe_route_v1"


class EvacuationPlanner:
    """Generate best and alternative evacuation routes without ML."""

    def plan(self, request: EvacuationPlanningRequest) -> EvacuationPlanningResponse:
        """Plan evacuation route to the safest reachable shelter."""

        graph = self._build_graph(request)
        blocked_road_ids = self._blocked_road_ids(request)
        graph = self._remove_blocked_roads(graph, blocked_road_ids)
        priority = self._priority(request)

        candidate_shelters = self._candidate_shelters(request)
        best_route = self._best_route(request, graph, candidate_shelters)
        alternative_route = self._alternative_route(request, graph, best_route)

        return EvacuationPlanningResponse(
            incident_id=request.incident_id,
            priority=priority,
            best_route=best_route,
            alternative_route=alternative_route,
            blocked_road_ids=sorted(blocked_road_ids),
            planning_method=PLANNING_METHOD,
        )

    def _build_graph(self, request: EvacuationPlanningRequest) -> nx.Graph:
        graph = nx.Graph()
        node_lookup = {node.node_id: node for node in request.road_graph.graph.nodes}

        for node in request.road_graph.graph.nodes:
            graph.add_node(node.node_id, coordinate=node.coordinate)

        for edge in request.road_graph.graph.edges:
            from_node = node_lookup.get(edge.from_node_id)
            to_node = node_lookup.get(edge.to_node_id)
            if from_node is None or to_node is None:
                continue
            risk_zone_ids, risk_penalty = self._segment_risk(
                from_node.coordinate,
                to_node.coordinate,
                request.risk_zones,
            )
            safety_cost = edge.safety_cost + (edge.distance_m * risk_penalty)
            graph.add_edge(
                edge.from_node_id,
                edge.to_node_id,
                edge_id=edge.edge_id,
                road_id=edge.road_id,
                status=edge.status,
                distance_m=edge.distance_m,
                safety_cost=safety_cost,
                risk_zone_ids=risk_zone_ids,
            )

        return graph

    @staticmethod
    def _blocked_road_ids(request: EvacuationPlanningRequest) -> set[str]:
        explicit = set(request.blocked_road_ids)
        graph_blocked = {blocked.road_id for blocked in request.road_graph.blocked_roads}
        edge_blocked = {
            edge.road_id
            for edge in request.road_graph.graph.edges
            if edge.status == RoadStatus.BLOCKED
        }
        return explicit | graph_blocked | edge_blocked

    @staticmethod
    def _remove_blocked_roads(graph: nx.Graph, blocked_road_ids: set[str]) -> nx.Graph:
        safe_graph = graph.copy()
        edges_to_remove = [
            (start, end)
            for start, end, data in safe_graph.edges(data=True)
            if data["road_id"] in blocked_road_ids or data["status"] == RoadStatus.BLOCKED
        ]
        safe_graph.remove_edges_from(edges_to_remove)
        return safe_graph

    def _best_route(
        self,
        request: EvacuationPlanningRequest,
        graph: nx.Graph,
        shelters: list[Shelter],
    ) -> EvacuationRoute:
        routes = [
            self._route_to_shelter(request, graph, shelter, route_id="best")
            for shelter in shelters
        ]
        found_routes = [route for route in routes if route.found]
        if not found_routes:
            return EvacuationRoute(
                route_id="best",
                found=False,
                reason="No reachable open shelter found after removing blocked roads.",
            )
        return min(
            found_routes,
            key=lambda route: (
                route.safety_cost if route.safety_cost is not None else float("inf"),
                route.estimated_time_minutes if route.estimated_time_minutes is not None else float("inf"),
            ),
        )

    def _alternative_route(
        self,
        request: EvacuationPlanningRequest,
        graph: nx.Graph,
        best_route: EvacuationRoute,
    ) -> EvacuationRoute | None:
        if not best_route.found or not best_route.shelter_id:
            return None

        shelter = next(
            (item for item in request.shelters if item.shelter_id == best_route.shelter_id),
            None,
        )
        if shelter is None:
            return None

        origin_node = self._nearest_node(graph, request.origin)
        shelter_node = self._nearest_node(graph, shelter.location)
        try:
            paths = nx.shortest_simple_paths(graph, origin_node, shelter_node, weight="safety_cost")
            next(paths, None)
            alternative_nodes = next(paths, None)
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return None

        if not alternative_nodes:
            return None
        return self._route_from_nodes(
            route_id="alternative",
            graph=graph,
            node_ids=alternative_nodes,
            shelter=shelter,
            request=request,
            reason="Alternative safe route to the selected shelter.",
        )

    def _route_to_shelter(
        self,
        request: EvacuationPlanningRequest,
        graph: nx.Graph,
        shelter: Shelter,
        route_id: str,
    ) -> EvacuationRoute:
        if graph.number_of_nodes() == 0:
            return EvacuationRoute(route_id=route_id, found=False, reason="Road graph is empty.")

        try:
            origin_node = self._nearest_node(graph, request.origin)
            shelter_node = self._nearest_node(graph, shelter.location)
            node_ids = nx.shortest_path(graph, origin_node, shelter_node, weight="safety_cost")
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return EvacuationRoute(
                route_id=route_id,
                found=False,
                shelter_id=shelter.shelter_id,
                shelter_name=shelter.name,
                reason=f"Shelter {shelter.name} is not reachable on safe roads.",
            )

        return self._route_from_nodes(
            route_id=route_id,
            graph=graph,
            node_ids=node_ids,
            shelter=shelter,
            request=request,
            reason=f"Safest reachable route to shelter {shelter.name}.",
        )

    def _route_from_nodes(
        self,
        route_id: str,
        graph: nx.Graph,
        node_ids: list[str],
        shelter: Shelter,
        request: EvacuationPlanningRequest,
        reason: str,
    ) -> EvacuationRoute:
        road_ids: list[str] = []
        risk_zone_ids: set[str] = set()
        distance_m = 0.0
        safety_cost = 0.0

        for start, end in zip(node_ids, node_ids[1:], strict=False):
            data = graph.get_edge_data(start, end)
            if data is None:
                continue
            road_ids.append(data["road_id"])
            distance_m += float(data["distance_m"])
            safety_cost += float(data["safety_cost"])
            risk_zone_ids.update(data.get("risk_zone_ids", []))

        occupancy_penalty = self._shelter_occupancy_penalty(shelter, request.people_count)
        safety_cost += distance_m * occupancy_penalty
        estimated_time = self._estimated_time_minutes(distance_m, request.walking_speed_kmph, safety_cost)

        return EvacuationRoute(
            route_id=route_id,
            found=True,
            shelter_id=shelter.shelter_id,
            shelter_name=shelter.name,
            road_ids=road_ids,
            node_ids=node_ids,
            coordinates=[graph.nodes[node_id]["coordinate"] for node_id in node_ids],
            distance_m=round(distance_m, 2),
            safety_cost=round(safety_cost, 2),
            estimated_time_minutes=estimated_time,
            risk_zone_ids=sorted(risk_zone_ids),
            reason=reason,
        )

    def _candidate_shelters(self, request: EvacuationPlanningRequest) -> list[Shelter]:
        shelters = [
            shelter
            for shelter in request.shelters
            if shelter.status != ShelterStatus.CLOSED
            and shelter.capacity - shelter.current_occupancy >= request.people_count
        ]
        if request.destination_shelter_id:
            return [
                shelter
                for shelter in shelters
                if shelter.shelter_id == request.destination_shelter_id
            ]
        return shelters

    @staticmethod
    def _segment_risk(
        start: GeoCoordinate,
        end: GeoCoordinate,
        risk_zones: list[RiskZone],
    ) -> tuple[list[str], float]:
        midpoint = GeoCoordinate(
            longitude=(start.longitude + end.longitude) / 2,
            latitude=(start.latitude + end.latitude) / 2,
        )
        touched: list[str] = []
        penalty = 0.0
        for zone in risk_zones:
            if EvacuationPlanner._distance_m(midpoint, zone.center) <= zone.radius_m:
                touched.append(zone.zone_id)
                penalty += zone.severity * 4.0
        return touched, penalty

    @staticmethod
    def _shelter_occupancy_penalty(shelter: Shelter, people_count: int) -> float:
        projected_occupancy = shelter.current_occupancy + people_count
        if shelter.capacity <= 0:
            return 10.0
        occupancy_ratio = projected_occupancy / shelter.capacity
        if shelter.status == ShelterStatus.LIMITED:
            occupancy_ratio += 0.25
        return max(0.0, occupancy_ratio - 0.75)

    @staticmethod
    def _estimated_time_minutes(distance_m: float, walking_speed_kmph: float, safety_cost: float) -> float:
        base_minutes = (distance_m / 1000) / walking_speed_kmph * 60
        congestion_multiplier = min(2.5, max(1.0, safety_cost / max(distance_m, 1.0)))
        return round(base_minutes * congestion_multiplier, 1)

    @staticmethod
    def _priority(request: EvacuationPlanningRequest) -> EvacuationPriority:
        max_risk = max((zone.severity for zone in request.risk_zones), default=0.0)
        blocked_count = len(request.blocked_road_ids) + len(request.road_graph.blocked_roads)
        if max_risk >= 0.85 or blocked_count >= 5:
            return EvacuationPriority.CRITICAL
        if max_risk >= 0.65 or blocked_count >= 3:
            return EvacuationPriority.HIGH
        if max_risk >= 0.35 or blocked_count >= 1:
            return EvacuationPriority.MODERATE
        return EvacuationPriority.LOW

    @staticmethod
    def _nearest_node(graph: nx.Graph, coordinate: GeoCoordinate) -> str:
        return min(
            graph.nodes,
            key=lambda node_id: EvacuationPlanner._distance_m(
                graph.nodes[node_id]["coordinate"],
                coordinate,
            ),
        )

    @staticmethod
    def _distance_m(first: GeoCoordinate, second: GeoCoordinate) -> float:
        radius_m = 6_371_000
        lat_1 = radians(first.latitude)
        lat_2 = radians(second.latitude)
        delta_lat = radians(second.latitude - first.latitude)
        delta_lon = radians(second.longitude - first.longitude)
        haversine = sin(delta_lat / 2) ** 2 + cos(lat_1) * cos(lat_2) * sin(delta_lon / 2) ** 2
        return 2 * radius_m * atan2(sqrt(haversine), sqrt(1 - haversine))
