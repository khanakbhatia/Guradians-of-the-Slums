import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import api from "@/lib/axios";
import { ENDPOINTS } from "@/api/endpoints";
import { QK } from "@/api/queryKeys";

export function useRiskZones() {
  return useQuery({
    queryKey: QK.authorityRiskZones,
    queryFn: async () => (await api.get(ENDPOINTS.AUTHORITY_RISK_ZONES)).data.riskZones,
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
    queryFn: async () => {
      throw new Error("No backend endpoint for authority-scoped analytics yet");
    },
    retry: false,
  });
}

export function useVolunteerSummary() {
  return useQuery({
    queryKey: QK.authorityVolunteers,
    queryFn: async () => (await api.get(ENDPOINTS.AUTHORITY_VOLUNTEERS)).data.volunteers,
  });
}

export function useAuthorityIncidentFeed() {
  return useQuery({
    queryKey: QK.authorityIncidents,
    queryFn: async () => (await api.get(ENDPOINTS.AUTHORITY_INCIDENTS)).data.incidents,
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
        .reports,
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
    },
  });
}

/**
 * NOT WIRED UP: the backend has no "recommendations feed" endpoint — only
 * POST /ai/assign-volunteers, which is per-incident (needs an
 * incidentId) and returns one recommendation, not an ambient list. This
 * dashboard widget assumes a standing list with no incident selected, so
 * it needs a UX decision (which incident? on-demand vs. background job?)
 * before it can call the real endpoint — that's product/design work, not
 * an endpoint fix, so it's flagged here instead of guessed at.
 */
export function useAiRecommendations() {
  return useQuery({
    queryKey: QK.authorityAiRecommendations,
    queryFn: async () => {
      throw new Error(
        "No backend endpoint for an AI recommendations feed yet — see useAiRecommendations in useAuthorityQueries.js"
      );
    },
    retry: false,
  });
}
