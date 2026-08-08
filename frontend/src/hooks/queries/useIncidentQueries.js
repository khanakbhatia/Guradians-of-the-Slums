import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import api from "@/lib/axios";
import { ENDPOINTS } from "@/api/endpoints";
import { QK } from "@/api/queryKeys";

export function useIncidentDetails(id) {
  return useQuery({
    queryKey: QK.incident(id),
    queryFn: async () => (await api.get(ENDPOINTS.incidentDetails(id))).data.incident,
    enabled: !!id,
  });
}

/**
 * Only "resolve" has a real backend counterpart: PATCH .../status with a
 * fixed status enum (active/resolved/archived). "escalate"/"reassign"/
 * "dispatch" aren't concepts the Incident API supports — no endpoint,
 * status value, or field represents them — so they're left to fail with
 * a clear message (surfaced via the existing "Action failed" toast)
 * rather than silently calling something that doesn't exist.
 */
export function useIncidentAction(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (action) => {
      if (action !== "resolve") {
        throw new Error(`"${action}" isn't supported by the incidents API yet — only resolving is`);
      }
      return (await api.patch(ENDPOINTS.incidentStatus(id), { status: "resolved" })).data;
    },
    onSuccess: (data) => {
      if (data) queryClient.setQueryData(QK.incident(id), data.incident ?? data);
      else queryClient.invalidateQueries({ queryKey: QK.incident(id) });
    },
  });
}
