import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import api from "@/lib/axios";
import { ENDPOINTS } from "@/api/endpoints";
import { QK } from "@/api/queryKeys";

export function useRiskStatus() {
  return useQuery({
    queryKey: QK.citizenRiskStatus,
    queryFn: async () => (await api.get(ENDPOINTS.CITIZEN_RISK_STATUS)).data,
  });
}

export function useNearbyShelters() {
  return useQuery({
    queryKey: QK.citizenShelters,
    queryFn: async () => (await api.get(ENDPOINTS.CITIZEN_SHELTERS)).data,
  });
}

export function useCitizenAlerts() {
  return useQuery({
    queryKey: QK.citizenAlerts,
    queryFn: async () => (await api.get(ENDPOINTS.CITIZEN_ALERTS)).data,
  });
}

export function useEmergencyContacts() {
  return useQuery({
    queryKey: QK.citizenContacts,
    queryFn: async () => (await api.get(ENDPOINTS.CITIZEN_CONTACTS)).data,
    staleTime: 1000 * 60 * 30, // contacts rarely change
  });
}

export function useDisasterTips() {
  return useQuery({
    queryKey: QK.citizenTips,
    queryFn: async () => (await api.get(ENDPOINTS.CITIZEN_TIPS)).data,
    staleTime: 1000 * 60 * 30,
  });
}

export function useCitizenNotifications() {
  return useQuery({
    queryKey: QK.citizenNotifications,
    queryFn: async () => (await api.get(ENDPOINTS.CITIZEN_NOTIFICATIONS)).data,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.post(ENDPOINTS.notificationRead(id))).data,
    onMutate: async (id) => {
      // optimistic: flip `read` locally right away, don't wait on the network
      queryClient.setQueryData(QK.citizenNotifications, (prev) =>
        Array.isArray(prev) ? prev.map((n) => (n.id === id ? { ...n, read: true } : n)) : prev
      );
    },
  });
}

/** Submit a new incident report. */
export function useReportIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post(ENDPOINTS.REPORT_INCIDENT, payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.citizenNotifications });
    },
  });
}
