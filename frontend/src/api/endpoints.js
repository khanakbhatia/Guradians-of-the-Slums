// Single source of truth for backend endpoint paths. Update here if the
// API's routes change — nothing else in the app should hardcode a path.
//
// src/lib/axios.js's baseURL is the versioned API root
// ("http://localhost:5000/api/v1"), so every path below is relative to
// that — no "/v1" prefix here.
//
// A few frontend concepts below (marked "NO BACKEND ROUTE") have nothing
// to call yet — the backend doesn't implement them. Per the brief, those
// are wired to /citizen-reports, /notifications, or left for the calling
// hook to render an empty state — never a guessed/invented path.

export const ENDPOINTS = {
  // Auth
  REGISTER: "/auth/register",
  LOGIN: "/auth/login",
  REFRESH_TOKEN: "/auth/refresh-token",
  LOGOUT: "/auth/logout",
  ME: "/auth/me",

  // Authority dashboard — no combined "authority overview/alerts/
  // analytics" endpoints exist; authority pulls from the same per-resource
  // endpoints admin/volunteers use, filtered/aggregated client-side.
  AUTHORITY_RISK_ZONES: "/risk-zones",
  AUTHORITY_VOLUNTEERS: "/volunteers",
  AUTHORITY_INCIDENTS: "/incidents",
  AUTHORITY_ANALYTICS: "/authority/analytics",
  AUTHORITY_AI_RECOMMENDATIONS: "/authority/ai-recommendations",
  // Pending citizen reports awaiting verification (?status=pending).
  AUTHORITY_APPROVALS: "/citizen-reports",
  approvalDecision: (id, decision) =>
    decision === "rejected"
      ? `/citizen-reports/${id}/reject`
      : `/citizen-reports/${id}/verify`,
  // POST only — backend needs a body (e.g. { incidentId }), there's no GET
  // "recommendations feed" endpoint.
  AI_ASSIGN_VOLUNTEERS: "/ai/assign-volunteers",
  AI_EVACUATION_ROUTES: "/ai/evacuation-routes",

  // Volunteer dashboard
  // trustScore lives on the volunteer's own profile — there's no separate
  // "/score" endpoint.
  VOLUNTEER_PROFILE: "/volunteers/me",
  VOLUNTEER_AVAILABILITY: "/volunteers/me/availability",
  VOLUNTEER_STATS: "/volunteers/me/stats",
  VOLUNTEER_LEADERBOARD: "/volunteers/leaderboard",
  // GET /tasks lists the caller's own tasks by default; ?open=true (or
  // ?status=open) instead lists unassigned open tasks for a volunteer to
  // browse/claim, optionally nearest-first via ?lng=&lat=&radiusKm=.
  TASKS: "/tasks",
  taskDetails: (id) => `/tasks/${id}`,
  taskAccept: (id) => `/tasks/${id}/accept`,
  taskReject: (id) => `/tasks/${id}/reject`,
  taskComplete: (id) => `/tasks/${id}/complete`,
  // NO BACKEND ROUTE: volunteer activity timeline (derived client-side from
  // /tasks timestamps instead — see useVolunteerTimeline).

  // Citizen dashboard
  // Citizens report hazards via CitizenReport, not Incident — POST
  // /incidents is authority/admin-only and would 403 for a citizen.
  CITIZEN_REPORTS: "/citizen-reports",
  citizenReportDetails: (id) => `/citizen-reports/${id}`,
  citizenReportImages: (id) => `/citizen-reports/${id}/images`,
  citizenReportStatus: (id) => `/citizen-reports/${id}/status`,
  // NO BACKEND ROUTE, and per the brief not to be pointed at a guessed
  // path either: nearby shelters, risk-status widget, emergency contacts,
  // disaster tips. The hooks for these render an empty state instead.

  // Shared — notifications
  NOTIFICATIONS: "/notifications",
  NOTIFICATIONS_UNREAD_COUNT: "/notifications/unread-count",
  NOTIFICATIONS_READ_ALL: "/notifications/read-all",
  // PATCH, not POST.
  notificationRead: (id) => `/notifications/${id}/read`,

  // Shared — incidents
  incidentDetails: (id) => `/incidents/${id}`,
  incidentStatus: (id) => `/incidents/${id}/status`,
  incidentTimeline: (id) => `/incidents/${id}/timeline`,
  // Status is a fixed enum (active/resolved/archived) via PATCH .../status
  // with { status }. There's no generic "escalate/reassign/dispatch"
  // action endpoint — only "resolve" maps cleanly onto this.

  // Admin dashboard
  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_PENDING_VOLUNTEERS: "/admin/volunteers/pending",
  adminApproveVolunteer: (id) => `/admin/volunteers/${id}/approve`,
  adminRejectVolunteer: (id) => `/admin/volunteers/${id}/reject`,
  // Covers the signup trend too (usersRegisteredPerDay), via ?days=N.
  ADMIN_ANALYTICS: "/admin/analytics",
  ADMIN_ACTIVITY_FEED: "/admin/activity-feed",
  // No dedicated "user breakdown" endpoint — it's dashboard.users.byRole
  // on ADMIN_DASHBOARD's response.
  // NO BACKEND ROUTE reachable from this base URL: the health check lives
  // at the unversioned "/api/health", one level up from "/api/v1" — not
  // under this axios instance's baseURL. See useSystemStatus.

  // Map — GuardiansMap/RiskHeatmap currently render static data from
  // src/data/mapData.js and never call these. Wired to real endpoints
  // where the backend has them; the rest have NO BACKEND ROUTE.
  MAP_HEATMAP: "/risk-zones/heatmap",
  MAP_GEOJSON: "/risk-zones/geojson",
  // NO BACKEND ROUTE: shelters, hospitals, schools, roads layers.
};
