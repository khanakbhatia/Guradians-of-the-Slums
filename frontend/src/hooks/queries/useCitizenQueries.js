import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import api from "@/lib/axios";
import { ENDPOINTS } from "@/api/endpoints";
import { QK } from "@/api/queryKeys";

// risk-status, nearby shelters, emergency contacts, and disaster tips have
// no backing resource anywhere in the backend (no routes for them exist —
// they were previously pointed at made-up paths like "/citizen/shelters").
// Per the brief, these resolve to an empty result rather than hitting a
// route that doesn't exist or being pointed at something invented; the
// dashboard cards render their existing "no data" state instead of an
// error. No network call is made.
function emptyState(value) {
  return () => Promise.resolve(value);
}

export function useRiskStatus() {
  return useQuery({
    queryKey: QK.citizenRiskStatus,
    queryFn: emptyState(null),
  });
}

export function useNearbyShelters() {
  return useQuery({
    queryKey: QK.citizenShelters,
    queryFn: emptyState([]),
  });
}

export function useEmergencyContacts() {
  return useQuery({
    queryKey: QK.citizenContacts,
    queryFn: emptyState([]),
    staleTime: 1000 * 60 * 30,
  });
}

export function useDisasterTips() {
  return useQuery({
    queryKey: QK.citizenTips,
    queryFn: emptyState([]),
    staleTime: 1000 * 60 * 30,
  });
}

/**
 * "Alerts" has no dedicated backend resource — mapped to the same
 * /notifications endpoint the notifications feed uses (the closest real
 * concept: advisories the citizen has been sent). EmergencyAlerts.jsx
 * reads the real Notification fields (title/message/priority/createdAt).
 */
export function useCitizenAlerts() {
  return useQuery({
    queryKey: QK.citizenAlerts,
    queryFn: async () => (await api.get(ENDPOINTS.NOTIFICATIONS)).data.notifications,
  });
}

/** Notifications feed — same endpoint every role uses. */
export function useCitizenNotifications() {
  return useQuery({
    queryKey: QK.citizenNotifications,
    queryFn: async () => (await api.get(ENDPOINTS.NOTIFICATIONS)).data.notifications,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    // PATCH, not POST — see endpoints.js.
    mutationFn: async (id) => (await api.patch(ENDPOINTS.notificationRead(id))).data,
    onMutate: async (id) => {
      // optimistic: flip `isRead` locally right away, don't wait on the network
      queryClient.setQueryData(QK.citizenNotifications, (prev) =>
        Array.isArray(prev) ? prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)) : prev
      );
    },
  });
}

/**
 * Submit a new hazard report. Citizens create CitizenReports, not
 * Incidents — POST /incidents is authority/admin-only and would 403 for
 * this role. Payload must include hazardType + description + location
 * (see ReportIncidentDialog.jsx for the mapping from UI labels to the
 * backend's hazardType enum).
 */
export function useReportIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post(ENDPOINTS.CITIZEN_REPORTS, payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.citizenNotifications });
    },
  });
}
