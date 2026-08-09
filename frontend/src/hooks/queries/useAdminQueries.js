import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import api from "@/lib/axios";
import { ENDPOINTS } from "@/api/endpoints";
import { QK } from "@/api/queryKeys";
import { getHealthUrl } from "@/lib/utils";

/**
 * GET /admin/dashboard returns nested counts (users/incidents/
 * riskZones/volunteers/tasks/citizenReports), not a flat array of stat
 * cards — reshaped here to what StatStrip/StatCard expect. No trend/
 * trendLabel: the backend doesn't compute period-over-period deltas, so
 * those are left out rather than invented (StatCard renders fine without
 * them).
 */
export function useAdminOverview() {
  return useQuery({
    queryKey: QK.adminOverview,
    queryFn: async () => {
      const { dashboard } = (await api.get(ENDPOINTS.ADMIN_DASHBOARD)).data;
      return [
        { id: "users", label: "Total users", value: dashboard.users.total, icon: "Users" },
        { id: "incidents", label: "Active incidents", value: dashboard.incidents.activeCount, icon: "Siren" },
        { id: "reports", label: "Pending reports", value: dashboard.citizenReports.pendingCount, icon: "ShieldCheck" },
        { id: "volunteers", label: "Pending volunteers", value: dashboard.volunteers.pendingVerificationCount, icon: "Crown" },
      ];
    },
  });
}

/** Derived from the same /admin/dashboard payload as useAdminOverview — users.byRole. */
export function useUserBreakdown() {
  return useQuery({
    queryKey: QK.adminUserBreakdown,
    queryFn: async () => {
      const { dashboard } = (await api.get(ENDPOINTS.ADMIN_DASHBOARD)).data;
      return Object.entries(dashboard.users.byRole).map(([name, value]) => ({ name, value }));
    },
  });
}

export function useSignupTrend() {
  return useQuery({
    queryKey: QK.adminSignupTrend,
    queryFn: async () => {
      const { analytics } = (await api.get(ENDPOINTS.ADMIN_ANALYTICS, { params: { days: 7 } })).data;
      return analytics.usersRegisteredPerDay.map((d) => ({ date: d.date, signups: d.count }));
    },
  });
}

export function useAdminActivity() {
  return useQuery({
    queryKey: QK.adminActivity,
    queryFn: async () => {
      const response = await api.get(ENDPOINTS.ADMIN_ACTIVITY_FEED);
      const feed = response.data.feed || [];
      return feed.map((a) => {
        let actorName = "System";
        if (a.performedBySystem && a.agentName) {
          actorName = `${a.agentName} (System)`;
        } else if (a.actor && typeof a.actor === "object") {
          actorName = `${a.actor.name} (${a.actor.role})`;
        }
        return {
          id: a._id,
          action: a.action.replace(/_/g, " "),
          actor: actorName,
          time: new Date(a.createdAt).toLocaleString(),
        };
      });
    },
  });
}

export function useSystemStatus() {
  return useQuery({
    queryKey: QK.adminSystemStatus,
    queryFn: async () => {
      try {
        const { data } = await api.get(getHealthUrl());
        return [
          { id: "database", label: "MongoDB Database", status: data.dependencies.database === "connected" ? "operational" : "down" },
          { id: "api", label: "Application API", status: "operational" },
        ];
      } catch (err) {
        return [
          { id: "database", label: "MongoDB Database", status: "down" },
          { id: "api", label: "Application API", status: "down" },
        ];
      }
    },
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30,
  });
}

export function usePendingVolunteers(page = 1) {
  return useQuery({
    queryKey: ["admin", "volunteers", "pending", page],
    queryFn: async () => {
      const response = await api.get(ENDPOINTS.ADMIN_PENDING_VOLUNTEERS, { params: { page, limit: 10 } });
      return response.data;
    },
  });
}

export function useApproveVolunteer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await api.post(ENDPOINTS.adminApproveVolunteer(id));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.adminOverview });
      queryClient.invalidateQueries({ queryKey: ["admin", "volunteers", "pending"] });
      queryClient.invalidateQueries({ queryKey: QK.adminActivity });
    },
  });
}

export function useRejectVolunteer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await api.post(ENDPOINTS.adminRejectVolunteer(id));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.adminOverview });
      queryClient.invalidateQueries({ queryKey: ["admin", "volunteers", "pending"] });
      queryClient.invalidateQueries({ queryKey: QK.adminActivity });
    },
  });
}
