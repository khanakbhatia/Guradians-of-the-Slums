import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import api from "@/lib/axios";
import { ENDPOINTS } from "@/api/endpoints";
import { QK } from "@/api/queryKeys";

// 20s, not 5s. At 5s this dashboard generated ~84 requests/minute (the
// overview stat strip alone fans out into 4 parallel count queries), which
// blew through the API's global rate limit and made every widget hang on
// 429s. 20s still reads as "live" for an operations dashboard while cutting
// request volume ~4x.
const LIVE_DASHBOARD_REFETCH_MS = 20000;

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

function reportRequester(report) {
  if (typeof report.reporter === "object" && report.reporter?.name) return report.reporter.name;
  return "Citizen";
}

function mapReportToApprovalItem(report) {
  return {
    ...report,
    type: report.hazardType,
    summary: report.description,
    requestedBy: reportRequester(report),
    time: formatTime(report.createdAt),
    imageCount: report.photos?.length ?? 0,
  };
}

export function useRiskZones() {
  return useQuery({
    queryKey: QK.authorityRiskZones,
    queryFn: async () => (await api.get(ENDPOINTS.AUTHORITY_RISK_ZONES, { params: { limit: 100 } })).data.riskZones,
    refetchInterval: LIVE_DASHBOARD_REFETCH_MS,
  });
}


/**
 * No combined "authority overview" endpoint exists — composed from
 * meta.totalItems (pagination counts) across the resource list endpoints
 * authority already has access to. limit=1 keeps each call cheap since
 * only the count is used.
 */
export function useAuthorityOverview() {
  return useQuery({
    queryKey: QK.authorityOverview,
    queryFn: async () => {
      const [incidents, riskZones, volunteers, reports] = await Promise.all([
        api.get(ENDPOINTS.AUTHORITY_INCIDENTS, { params: { limit: 1 } }),
        api.get(ENDPOINTS.AUTHORITY_RISK_ZONES, { params: { limit: 1, riskLevel: "critical" } }),
        api.get(ENDPOINTS.AUTHORITY_VOLUNTEERS, { params: { limit: 1 } }),
        api.get(ENDPOINTS.AUTHORITY_APPROVALS, { params: { limit: 1, status: "pending" } }),
      ]);
      return [
        { id: "incidents", label: "Active incidents", value: incidents.meta?.totalItems ?? incidents.data.incidents.length, icon: "Siren" },
        { id: "risk-zones", label: "Critical risk zones", value: riskZones.meta?.totalItems ?? riskZones.data.riskZones.length, icon: "AlertTriangle" },
        { id: "volunteers", label: "Volunteers", value: volunteers.meta?.totalItems ?? volunteers.data.volunteers.length, icon: "Users" },
        { id: "approvals", label: "Pending approvals", value: reports.meta?.totalItems ?? reports.data.reports.length, icon: "Clock" },
      ];
    },
    refetchInterval: LIVE_DASHBOARD_REFETCH_MS,
  });
}

/**
 * No "alerts" resource exists — derived from the highest-risk zones
 * (riskLevel=high,critical), which is the closest real concept to
 * "zone-level advisories." title/zone/time all come from real RiskZone
 * fields (hazardType, settlement, updatedAt).
 */
export function useAuthorityAlerts() {
  return useQuery({
    queryKey: QK.authorityAlerts,
    queryFn: async () => {
      const { data } = await api.get(ENDPOINTS.AUTHORITY_RISK_ZONES, {
        params: { riskLevel: "high,critical", sort: "-updatedAt", limit: 10 },
      });
      return data.riskZones.map((z) => ({
        id: z.id,
        severity: z.riskLevel,
        title: `${z.hazardType} risk — ${z.name || z.blockId}`,
        zone: z.settlement,
        time: z.updatedAt,
      }));
    },
  });
}

/**
 * NOT WIRED UP: this needs a 7-day incident trend (only exposed via
 * GET /admin/analytics, which is authorize('admin') — 403s for
 * authority) and a per-zone open-vs-resolved breakdown, which no endpoint
 * computes at all. Left explicit rather than half-composing something
 * that would either 403 or require client-side aggregation the backend
 * doesn't support (zone membership isn't exposed on Incident).
 */
export function useAuthorityAnalytics() {
  return useQuery({
    queryKey: QK.authorityAnalytics,
    queryFn: async () => (await api.get(ENDPOINTS.AUTHORITY_ANALYTICS)).data.analytics,
  });
}

/**
 * Volunteer summary, shaped as FIELD TEAMS rather than individuals.
 *
 * VolunteerSummary.jsx renders Team / Zone / Members / Status / Tasks done,
 * but GET /volunteers returns individual Volunteer documents, which have no
 * `name`, `zone`, `members` or `tasksDone` field at all — so every column
 * except Status rendered blank. A Volunteer is a person, not a team, so the
 * fix is to aggregate them into the teams the table is actually describing:
 * volunteers are grouped by their NGO affiliation (the real-world "team"),
 * with member counts and completed-task totals summed per team.
 *
 * Zone is resolved from each volunteer's currentLocation against the risk
 * zones already in the React Query cache (nearest zone centroid), so this
 * needs no extra network request and no new backend endpoint.
 */
export function useVolunteerSummary() {
  const { data: zones } = useRiskZones();

  return useQuery({
    queryKey: [...QK.authorityVolunteers, "teams", zones?.length ?? 0],
    queryFn: async () => {
      const volunteers = (await api.get(ENDPOINTS.AUTHORITY_VOLUNTEERS)).data.volunteers || [];

      const nearestZoneName = (coords) => {
        if (!coords?.length || !zones?.length) return "—";
        let best = null;
        let bestDist = Infinity;
        for (const z of zones) {
          const ring = z.geometry?.coordinates?.[0];
          if (!ring?.length) continue;
          // Polygon centroid (mean of ring vertices) is accurate enough to
          // pick the nearest zone at settlement scale.
          const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
          const cy = ring.reduce((s, p) => s + p[1], 0) / ring.length;
          const d = (coords[0] - cx) ** 2 + (coords[1] - cy) ** 2;
          if (d < bestDist) {
            bestDist = d;
            best = z;
          }
        }
        return best?.settlement || best?.name || "—";
      };

      const teams = new Map();
      for (const v of volunteers) {
        const teamName = v.ngoAffiliation || "Independent volunteers";
        if (!teams.has(teamName)) {
          teams.set(teamName, {
            id: teamName,
            name: teamName,
            zones: new Map(),
            members: 0,
            tasksDone: 0,
            available: 0,
            busy: 0,
          });
        }
        const team = teams.get(teamName);
        team.members += 1;
        team.tasksDone += v.completedTasksCount || 0;
        if (v.availability === "available") team.available += 1;
        if (v.availability === "busy") team.busy += 1;

        const zoneName = nearestZoneName(v.currentLocation?.coordinates);
        team.zones.set(zoneName, (team.zones.get(zoneName) || 0) + 1);
      }

      return [...teams.values()]
        .map((t) => {
          // Label the team with the zone most of its members are working in.
          const zone = [...t.zones.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
          // Map onto the status vocabulary VolunteerSummary's STATUS_VARIANT
          // already understands: active / standby / off-duty.
          const status = t.available > 0 ? "active" : t.busy > 0 ? "standby" : "off-duty";
          return { id: t.id, name: t.name, zone, members: t.members, tasksDone: t.tasksDone, status };
        })
        .sort((a, b) => b.members - a.members);
    },
    enabled: true,
  });
}

export function useAuthorityIncidentFeed() {
  return useQuery({
    queryKey: QK.authorityIncidents,
    queryFn: async () => {
      const response = await api.get(ENDPOINTS.AUTHORITY_INCIDENTS);
      const incidents = response.data.incidents || [];
      return incidents.map((inc) => ({
        id: inc._id || inc.id,
        zone: inc.riskZone?.name || inc.riskZone?.blockId || "General Area",
        // Incident.model.js calls this field `type` (enum INCIDENT_TYPES);
        // `hazardType` is RiskZone's field name, not Incident's. Reading
        // inc.hazardType returned undefined, so the incident feed's Type
        // column rendered blank for every row. Fall back to the zone's
        // hazardType only if the incident itself has none.
        type: inc.type || inc.riskZone?.hazardType,
        severity: inc.severity,
        team: inc.assignedVolunteer?.user?.name || "Unassigned",
        eta: inc.estimatedTimeMinutes ? `${inc.estimatedTimeMinutes} mins` : "—",
        time: inc.createdAt ? new Date(inc.createdAt).toLocaleString() : "—",
      }));
    },
    refetchInterval: LIVE_DASHBOARD_REFETCH_MS,
  });
}

/** Citizen reports pending verification. */
export function useApprovalQueue() {
  return useQuery({
    queryKey: QK.authorityApprovals,
    // list endpoint returns { reports: [...] } — unwrap to the array the
    // component expects.
    queryFn: async () =>
      (await api.get(ENDPOINTS.AUTHORITY_APPROVALS, { params: { status: "pending" } })).data
        .reports.map(mapReportToApprovalItem),
    refetchInterval: LIVE_DASHBOARD_REFETCH_MS,
  });
}

/** Approve/reject a pending citizen report. Optimistically removes it from the cached queue. */
export function useApprovalDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, decision, note }) =>
      (await api.post(ENDPOINTS.approvalDecision(id, decision), { note })).data,
    onSuccess: (_data, { id }) => {
      queryClient.setQueryData(QK.authorityApprovals, (prev) =>
        Array.isArray(prev) ? prev.filter((item) => item.id !== id) : prev
      );
      queryClient.invalidateQueries({ queryKey: QK.authorityOverview });
      queryClient.invalidateQueries({ queryKey: QK.authorityIncidents });
      queryClient.invalidateQueries({ queryKey: QK.authorityRiskZones });
      queryClient.invalidateQueries({ queryKey: QK.authorityAlerts });
      queryClient.invalidateQueries({ queryKey: QK.authorityAnalytics });
      queryClient.invalidateQueries({ queryKey: QK.authorityAiRecommendations });
      queryClient.invalidateQueries({ queryKey: QK.volunteerNearbyRequests });
    },
  });
}

export function useAiRecommendations() {
  return useQuery({
    queryKey: QK.authorityAiRecommendations,
    queryFn: async () => (await api.get(ENDPOINTS.AUTHORITY_AI_RECOMMENDATIONS)).data.recommendations,
    refetchInterval: 15000,
  });
}
