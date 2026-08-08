import { useQuery } from "@tanstack/react-query";

import api from "@/lib/axios";
import { ENDPOINTS } from "@/api/endpoints";
import { QK } from "@/api/queryKeys";

export function useAdminOverview() {
  return useQuery({
    queryKey: QK.adminOverview,
    queryFn: async () => (await api.get(ENDPOINTS.ADMIN_OVERVIEW)).data,
  });
}

export function useUserBreakdown() {
  return useQuery({
    queryKey: QK.adminUserBreakdown,
    queryFn: async () => (await api.get(ENDPOINTS.ADMIN_USER_BREAKDOWN)).data,
  });
}

export function useSignupTrend() {
  return useQuery({
    queryKey: QK.adminSignupTrend,
    queryFn: async () => (await api.get(ENDPOINTS.ADMIN_SIGNUP_TREND)).data,
  });
}

export function useAdminActivity() {
  return useQuery({
    queryKey: QK.adminActivity,
    queryFn: async () => (await api.get(ENDPOINTS.ADMIN_ACTIVITY)).data,
  });
}

export function useSystemStatus() {
  return useQuery({
    queryKey: QK.adminSystemStatus,
    queryFn: async () => (await api.get(ENDPOINTS.ADMIN_SYSTEM_STATUS)).data,
    // service status is worth checking more often than the 2-minute default
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30,
  });
}
