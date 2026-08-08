import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import api from "@/lib/axios";
import { ENDPOINTS } from "@/api/endpoints";
import { QK } from "@/api/queryKeys";

export function useVolunteerScore() {
  return useQuery({
    queryKey: QK.volunteerScore,
    queryFn: async () => (await api.get(ENDPOINTS.VOLUNTEER_SCORE)).data,
  });
}

export function useVolunteerAvailability() {
  return useQuery({
    queryKey: QK.volunteerAvailability,
    queryFn: async () => (await api.get(ENDPOINTS.VOLUNTEER_AVAILABILITY)).data,
  });
}

export function useUpdateAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (next) => (await api.put(ENDPOINTS.VOLUNTEER_AVAILABILITY, next)).data,
    onSuccess: (data) => {
      queryClient.setQueryData(QK.volunteerAvailability, data);
    },
  });
}

export function useVolunteerTimeline() {
  return useQuery({
    queryKey: QK.volunteerTimeline,
    queryFn: async () => (await api.get(ENDPOINTS.VOLUNTEER_TIMELINE)).data,
  });
}

export function useVolunteerLeaderboard() {
  return useQuery({
    queryKey: QK.volunteerLeaderboard,
    queryFn: async () => (await api.get(ENDPOINTS.VOLUNTEER_LEADERBOARD)).data,
  });
}

export function useVolunteerTasks() {
  return useQuery({
    queryKey: QK.volunteerTasks,
    queryFn: async () => (await api.get(ENDPOINTS.VOLUNTEER_TASKS)).data,
  });
}

/** Accept / decline / complete a task. Server returns the updated task list. */
export function useTaskAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }) =>
      (await api.post(ENDPOINTS.taskAction(id), { action })).data,
    onSuccess: (data) => {
      if (data) queryClient.setQueryData(QK.volunteerTasks, data);
      else queryClient.invalidateQueries({ queryKey: QK.volunteerTasks });
    },
  });
}

export function useNearbyRequests() {
  return useQuery({
    queryKey: QK.volunteerNearbyRequests,
    queryFn: async () => (await api.get(ENDPOINTS.VOLUNTEER_NEARBY_REQUESTS)).data,
  });
}

/** Claim a nearby request — removes it from the request pool and adds it to tasks. */
export function useClaimRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.post(`${ENDPOINTS.VOLUNTEER_NEARBY_REQUESTS}/${id}/claim`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.volunteerNearbyRequests });
      queryClient.invalidateQueries({ queryKey: QK.volunteerTasks });
    },
  });
}
