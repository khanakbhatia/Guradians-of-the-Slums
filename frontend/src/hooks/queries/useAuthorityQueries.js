import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import api from "@/lib/axios";
import { ENDPOINTS } from "@/api/endpoints";
import { QK } from "@/api/queryKeys";

export function useAuthorityOverview() {
  return useQuery({
    queryKey: QK.authorityOverview,
    queryFn: async () => (await api.get(ENDPOINTS.AUTHORITY_OVERVIEW)).data,
  });
}

export function useRiskZones() {
  return useQuery({
    queryKey: QK.authorityRiskZones,
    queryFn: async () => (await api.get(ENDPOINTS.AUTHORITY_RISK_ZONES)).data,
  });
}

export function useAuthorityAlerts() {
  return useQuery({
    queryKey: QK.authorityAlerts,
    queryFn: async () => (await api.get(ENDPOINTS.AUTHORITY_ALERTS)).data,
  });
}

/** Combined trend / zone-load / severity-mix payload for AnalyticsCards. */
export function useAuthorityAnalytics() {
  return useQuery({
    queryKey: QK.authorityAnalytics,
    queryFn: async () => (await api.get(ENDPOINTS.AUTHORITY_ANALYTICS)).data,
  });
}

export function useVolunteerSummary() {
  return useQuery({
    queryKey: QK.authorityVolunteers,
    queryFn: async () => (await api.get(ENDPOINTS.AUTHORITY_VOLUNTEERS)).data,
  });
}

export function useAuthorityIncidentFeed() {
  return useQuery({
    queryKey: QK.authorityIncidents,
    queryFn: async () => (await api.get(ENDPOINTS.AUTHORITY_INCIDENTS)).data,
  });
}

export function useApprovalQueue() {
  return useQuery({
    queryKey: QK.authorityApprovals,
    queryFn: async () => (await api.get(ENDPOINTS.AUTHORITY_APPROVALS)).data,
  });
}

/** Approve/reject a pending request. Optimistically removes it from the cached queue. */
export function useApprovalDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, decision }) =>
      (await api.post(ENDPOINTS.approvalDecision(id), { decision })).data,
    onSuccess: (_data, { id }) => {
      queryClient.setQueryData(QK.authorityApprovals, (prev) =>
        Array.isArray(prev) ? prev.filter((item) => item.id !== id) : prev
      );
    },
  });
}

export function useAiRecommendations() {
  return useQuery({
    queryKey: QK.authorityAiRecommendations,
    queryFn: async () => (await api.get(ENDPOINTS.AUTHORITY_AI_RECOMMENDATIONS)).data,
  });
}
