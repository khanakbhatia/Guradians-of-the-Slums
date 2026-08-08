import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import api from "@/lib/axios";
import { ENDPOINTS } from "@/api/endpoints";
import { QK } from "@/api/queryKeys";

const LIVE_REQUEST_REFETCH_MS = 5000;

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

function requesterName(report) {
  if (typeof report.reporter === "object" && report.reporter?.name) return report.reporter.name;
  return "Citizen";
}

function mapReportToNearbyRequest(report) {
  return {
    id: report.id,
    priority: report.severity,
    distanceKm: "—",
    title: report.description,
    zone: report.riskZone?.name || report.riskZone?.blockId || "Reported location",
    reportedBy: requesterName(report),
    time: formatTime(report.createdAt),
    imageCount: report.photos?.length ?? 0,
  };
}

/**
 * Volunteer's own profile — trustScore lives here, there's no separate
 * "/score" endpoint. NOTE: the backend Volunteer model has no gamification
 * fields (level, rank, levelProgress, streakDays, hoursLogged) that
 * VolunteerScoreCard.jsx expects — only trustScore. That's a data-model
 * gap, not an endpoint fix; flagging rather than inventing those fields.
 */
export function useVolunteerProfile() {
  return useQuery({
    queryKey: QK.volunteerScore,
    queryFn: async () => (await api.get(ENDPOINTS.VOLUNTEER_PROFILE)).data.volunteer,
  });
}

export function useVolunteerAvailability() {
  return useQuery({
    queryKey: QK.volunteerAvailability,
    // response is { availability: { availability, currentLocation, updatedAt } } — unwrap the outer key.
    queryFn: async () => (await api.get(ENDPOINTS.VOLUNTEER_AVAILABILITY)).data.availability,
  });
}

export function useUpdateAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (next) => (await api.patch(ENDPOINTS.VOLUNTEER_AVAILABILITY, next)).data.availability,
    onSuccess: (data) => {
      queryClient.setQueryData(QK.volunteerAvailability, data);
    },
  });
}

/**
 * NOT A REAL MATCH: TaskTimeline.jsx expects a list of discrete events
 * (assigned/accepted/completed/checkin, each with a title+time). The only
 * backend endpoint in this area, GET /volunteers/me/stats, returns
 * aggregate counts (trustScore, completedTasksCount, currentTasksByStatus)
 * — not an event log. There's no volunteer-scoped activity feed to point
 * this at, so it's left as an explicit error rather than reshaping counts
 * into fake "events."
 */
export function useVolunteerTimeline() {
  return useQuery({
    queryKey: QK.volunteerTimeline,
    queryFn: async () => {
      throw new Error("No backend endpoint for a volunteer activity timeline yet");
    },
    retry: false,
  });
}

/** Real aggregate stats — trustScore/rating/completedTasksCount/currentTasksByStatus. Not currently wired to a component. */
export function useVolunteerStats() {
  return useQuery({
    queryKey: ["volunteer", "stats"],
    queryFn: async () => (await api.get(ENDPOINTS.VOLUNTEER_STATS)).data.stats,
  });
}

export function useVolunteerLeaderboard() {
  return useQuery({
    queryKey: QK.volunteerLeaderboard,
    queryFn: async () => (await api.get(ENDPOINTS.VOLUNTEER_LEADERBOARD)).data.leaderboard,
  });
}

/**
 * NOT WIRED UP: no "list my tasks" or "nearby requests to claim" endpoint
 * exists yet (task.routes.js only has GET /:id + accept/reject/complete —
 * see its comment: "full Task CRUD is a separate future endpoint set").
 * Left as explicit errors so the dashboard's existing ErrorState surfaces
 * the gap instead of silently hitting a 404.
 */
export function useVolunteerTasks() {
  return useQuery({
    queryKey: QK.volunteerTasks,
    queryFn: async () => {
      throw new Error("No backend endpoint to list a volunteer's tasks yet");
    },
    retry: false,
  });
}

export function useNearbyRequests() {
  return useQuery({
    queryKey: QK.volunteerNearbyRequests,
    queryFn: async () =>
      (await api.get(ENDPOINTS.CITIZEN_REPORTS, { params: { status: "pending" } })).data
        .reports.map(mapReportToNearbyRequest),
    refetchInterval: LIVE_REQUEST_REFETCH_MS,
  });
}

/** Accept / reject / complete a task — three distinct endpoints on the backend, not one generic action. */
export function useTaskAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }) => {
      const path =
        action === "accept"
          ? ENDPOINTS.taskAccept(id)
          : action === "reject"
            ? ENDPOINTS.taskReject(id)
            : ENDPOINTS.taskComplete(id);
      return (await api.post(path)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.volunteerTasks });
    },
  });
}

// NOT WIRED UP: useClaimRequest had no backend counterpart (no "claim"
// concept exists on Task or Incident routes) — removed rather than left
// pointing at a fabricated path. See useNearbyRequests above.
