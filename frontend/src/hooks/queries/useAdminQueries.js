import { useQuery } from "@tanstack/react-query";

import api from "@/lib/axios";
import { ENDPOINTS } from "@/api/endpoints";
import { QK } from "@/api/queryKeys";

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
    queryFn: async () => (await api.get(ENDPOINTS.ADMIN_ACTIVITY_FEED)).data.feed,
  });
}

/**
 * NO CONFIRMED ENDPOINT: a health/system-status check wasn't in the
 * confirmed backend route list (auth, users, incidents, notifications,
 * risk-zones, citizen-reports, media, admin), and this axios instance's
 * baseURL is fixed to the versioned API root — a "/health" route, if one
 * exists, would live outside it. Resolves to an empty list rather than
 * guessing at a path; the widget shows its normal empty state instead of
 * a network error.
 */
export function useSystemStatus() {
  return useQuery({
    queryKey: QK.adminSystemStatus,
    queryFn: () => Promise.resolve([]),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30,
  });
}
