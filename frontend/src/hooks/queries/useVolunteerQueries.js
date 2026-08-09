import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import api from "@/lib/axios";
import { ENDPOINTS } from "@/api/endpoints";
import { QK } from "@/api/queryKeys";
import { useAuth } from "@/context/AuthContext";

// 15s, not 5s — see the note in useAuthorityQueries.js (global rate-limit
// exhaustion from aggressive dashboard polling).
const LIVE_REQUEST_REFETCH_MS = 15000;

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

/** Great-circle distance in km between two [lng, lat] points (Haversine), for display only. */
function distanceKm([lngA, latA], [lngB, latB]) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(latB - latA);
  const dLon = toRad(lngB - lngA);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapTaskToNearbyRequest(task, origin) {
  const coords = task.location?.coordinates;
  const km = origin && coords ? distanceKm(origin, coords) : null;
  return {
    id: task._id,
    priority: task.priority,
    distanceKm: km !== null ? km.toFixed(1) : "—",
    title: task.title,
    zone: task.riskZone?.name || task.riskZone?.blockId || "Task location",
    reportedBy: "Authority",
    time: formatTime(task.createdAt),
    imageCount: 0,
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
      const response = await api.get(ENDPOINTS.TASKS);
      const tasks = response.data.tasks || [];
      const events = [];
      tasks.forEach((t) => {
        const zone = t.riskZone?.name || t.riskZone?.blockId || "Assigned location";
        if (t.createdAt) {
          events.push({
            id: `${t._id}-assigned`,
            type: "assigned",
            title: `Assigned: ${t.title} (${zone})`,
            time: new Date(t.createdAt).toLocaleString(),
            dateObj: new Date(t.createdAt),
          });
        }
        if (t.acceptedAt) {
          events.push({
            id: `${t._id}-accepted`,
            type: "accepted",
            title: `Accepted: ${t.title}`,
            time: new Date(t.acceptedAt).toLocaleString(),
            dateObj: new Date(t.acceptedAt),
          });
        }
        if (t.completedAt) {
          events.push({
            id: `${t._id}-completed`,
            type: "completed",
            title: `Completed: ${t.title}`,
            time: new Date(t.completedAt).toLocaleString(),
            dateObj: new Date(t.completedAt),
          });
        }
      });
      events.sort((a, b) => b.dateObj - a.dateObj);
      return events.slice(0, 10);
    },
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
  const { user } = useAuth();
  return useQuery({
    queryKey: QK.volunteerLeaderboard,
    queryFn: async () => {
      const response = await api.get(ENDPOINTS.VOLUNTEER_LEADERBOARD);
      const list = response.data.leaderboard || [];
      return list.map((v) => ({
        id: v._id,
        name: v.user?.name || "Volunteer",
        tasksCompleted: v.completedTasksCount,
        score: v.trustScore,
        isCurrentUser: v.user?._id === user?.id || v.user?._id === user?._id || v.user === user?.id,
      }));
    },
  });
}

export function useVolunteerTasks() {
  return useQuery({
    queryKey: QK.volunteerTasks,
    queryFn: async () => {
      const response = await api.get(ENDPOINTS.TASKS);
      const tasks = response.data.tasks || [];
      return tasks.map((t) => {
        let frontendStatus = t.status;
        if (t.status === "assigned" && t.acceptedAt) {
          frontendStatus = "accepted";
        } else if (t.status === "in_progress") {
          frontendStatus = "accepted";
        }
        return {
          id: t._id,
          title: t.title,
          description: t.description,
          priority: t.priority,
          status: frontendStatus,
          zone: t.riskZone?.name || t.riskZone?.blockId || "Assigned location",
          eta: t.estimatedTimeMinutes ? `${t.estimatedTimeMinutes} mins` : "—",
        };
      });
    },
  });
}

/**
 * Open, unassigned tasks a volunteer can browse and accept — backed by
 * GET /tasks?open=true (added alongside POST /tasks so authorities can
 * actually post tasks for this to list). Sorted nearest-first when the
 * volunteer has a known currentLocation (see useVolunteerAvailability);
 * otherwise falls back to newest-first.
 */
export function useNearbyRequests() {
  const { data: availability } = useVolunteerAvailability();
  const coords = availability?.currentLocation?.coordinates;

  return useQuery({
    queryKey: QK.volunteerNearbyRequests,
    queryFn: async () => {
      const params = { open: true };
      if (coords?.length === 2) {
        params.lng = coords[0];
        params.lat = coords[1];
        params.radiusKm = 15;
      }
      const response = await api.get(ENDPOINTS.TASKS, { params });
      const tasks = response.data.tasks || [];
      return tasks.map((t) => mapTaskToNearbyRequest(t, coords?.length === 2 ? coords : null));
    },
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
