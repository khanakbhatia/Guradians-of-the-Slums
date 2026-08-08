import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import api from "@/lib/axios";
import { ENDPOINTS } from "@/api/endpoints";
import { QK } from "@/api/queryKeys";

export function useIncidentDetails(id) {
  return useQuery({
    queryKey: QK.incident(id),
    queryFn: async () => (await api.get(ENDPOINTS.incidentDetails(id))).data,
    enabled: !!id,
  });
}

/** Escalate / reassign / dispatch / resolve — logged as an action against the incident. */
export function useIncidentAction(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (action) => (await api.post(ENDPOINTS.incidentAction(id), { action })).data,
    onSuccess: (data) => {
      if (data) queryClient.setQueryData(QK.incident(id), data);
      else queryClient.invalidateQueries({ queryKey: QK.incident(id) });
    },
  });
}
