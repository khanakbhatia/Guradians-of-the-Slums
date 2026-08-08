// Central query-key registry so keys never drift/collide between hooks.

export const QK = {
  authorityOverview: ["authority", "overview"],
  authorityRiskZones: ["authority", "risk-zones"],
  authorityAlerts: ["authority", "alerts"],
  authorityAnalytics: ["authority", "analytics"],
  authorityVolunteers: ["authority", "volunteers"],
  authorityIncidents: ["authority", "incidents"],
  authorityApprovals: ["authority", "approvals"],
  authorityAiRecommendations: ["authority", "ai-recommendations"],

  volunteerScore: ["volunteer", "score"],
  volunteerAvailability: ["volunteer", "availability"],
  volunteerTasks: ["volunteer", "tasks"],
  volunteerTimeline: ["volunteer", "timeline"],
  volunteerLeaderboard: ["volunteer", "leaderboard"],
  volunteerNearbyRequests: ["volunteer", "nearby-requests"],

  citizenRiskStatus: ["citizen", "risk-status"],
  citizenShelters: ["citizen", "shelters"],
  citizenAlerts: ["citizen", "alerts"],
  citizenReports: ["citizen", "reports"],
  citizenContacts: ["citizen", "emergency-contacts"],
  citizenTips: ["citizen", "disaster-tips"],
  citizenNotifications: ["citizen", "notifications"],

  adminOverview: ["admin", "overview"],
  adminUserBreakdown: ["admin", "user-breakdown"],
  adminSignupTrend: ["admin", "signup-trend"],
  adminActivity: ["admin", "activity"],
  adminSystemStatus: ["admin", "system-status"],

  incident: (id) => ["incident", id],
  notifications: ["notifications"],

  mapShelters: ["map", "shelters"],
  mapHospitals: ["map", "hospitals"],
  mapSchools: ["map", "schools"],
  mapRoads: ["map", "roads"],
  mapHeatmap: ["map", "heatmap"],
};
