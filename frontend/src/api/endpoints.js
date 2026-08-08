// Single source of truth for backend endpoint paths. Update here if the
// API's routes change — nothing else in the app should hardcode a path.

export const ENDPOINTS = {
  // Authority dashboard
  AUTHORITY_OVERVIEW: "/authority/overview",
  AUTHORITY_RISK_ZONES: "/authority/risk-zones",
  AUTHORITY_ALERTS: "/authority/alerts",
  AUTHORITY_ANALYTICS: "/authority/analytics",
  AUTHORITY_VOLUNTEERS: "/authority/volunteers",
  AUTHORITY_INCIDENTS: "/authority/incidents",
  AUTHORITY_APPROVALS: "/authority/approvals",
  approvalDecision: (id) => `/authority/approvals/${id}/decision`,
  AUTHORITY_AI_RECOMMENDATIONS: "/authority/ai-recommendations",

  // Volunteer dashboard
  VOLUNTEER_SCORE: "/volunteer/score",
  VOLUNTEER_AVAILABILITY: "/volunteer/availability",
  VOLUNTEER_TASKS: "/volunteer/tasks",
  taskAction: (id) => `/volunteer/tasks/${id}/action`,
  VOLUNTEER_TIMELINE: "/volunteer/timeline",
  VOLUNTEER_LEADERBOARD: "/volunteer/leaderboard",
  VOLUNTEER_NEARBY_REQUESTS: "/volunteer/nearby-requests",

  // Citizen dashboard
  CITIZEN_RISK_STATUS: "/citizen/risk-status",
  CITIZEN_SHELTERS: "/citizen/shelters",
  CITIZEN_ALERTS: "/citizen/alerts",
  CITIZEN_CONTACTS: "/citizen/emergency-contacts",
  CITIZEN_TIPS: "/citizen/disaster-tips",
  CITIZEN_NOTIFICATIONS: "/citizen/notifications",
  REPORT_INCIDENT: "/incidents",

  // Admin dashboard
  ADMIN_OVERVIEW: "/admin/overview",
  ADMIN_USER_BREAKDOWN: "/admin/users/breakdown",
  ADMIN_SIGNUP_TREND: "/admin/users/signup-trend",
  ADMIN_ACTIVITY: "/admin/activity",
  ADMIN_SYSTEM_STATUS: "/admin/system-status",

  // Shared
  incidentDetails: (id) => `/incidents/${id}`,
  incidentAction: (id) => `/incidents/${id}/actions`,
  NOTIFICATIONS: "/notifications",
  notificationRead: (id) => `/notifications/${id}/read`,
  NOTIFICATIONS_READ_ALL: "/notifications/read-all",

  // Map
  MAP_SHELTERS: "/map/shelters",
  MAP_HOSPITALS: "/map/hospitals",
  MAP_SCHOOLS: "/map/schools",
  MAP_ROADS: "/map/roads",
  MAP_HEATMAP: "/map/heatmap",
};
