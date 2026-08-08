// All data on this page is DUMMY / STATIC. No backend is integrated —
// swap these exports for real API/query results later without touching
// the components that consume them.

export const OVERVIEW_STATS = [
  { id: "open", label: "Open incidents", value: "22", icon: "Siren", trend: -8, trendLabel: "vs last week" },
  { id: "critical", label: "Critical alerts", value: "8", icon: "AlertTriangle", trend: 12, trendLabel: "vs last week" },
  { id: "teams", label: "Field teams active", value: "16", icon: "Users", trend: 4, trendLabel: "vs last week" },
  { id: "response", label: "Avg. response time", value: "9.4m", icon: "Clock", trend: -15, trendLabel: "vs last week" },
];

export const RISK_ZONES = [
  { id: "z1", name: "Dharavi Sector 4", lat: 19.0430, lng: 72.8570, risk: 88, incidents: 14 },
  { id: "z2", name: "Govandi East", lat: 19.0550, lng: 72.9160, risk: 71, incidents: 9 },
  { id: "z3", name: "Kurla West", lat: 19.0728, lng: 72.8794, risk: 46, incidents: 6 },
  { id: "z4", name: "Mankhurd", lat: 19.0490, lng: 72.9330, risk: 38, incidents: 5 },
  { id: "z5", name: "Chembur North", lat: 19.0620, lng: 72.9000, risk: 24, incidents: 3 },
  { id: "z6", name: "Bandra East Slums", lat: 19.0640, lng: 72.8480, risk: 55, incidents: 7 },
];

export const RECENT_ALERTS = [
  { id: "AL-441", severity: "critical", title: "Fire hazard escalation", zone: "Dharavi Sector 4", time: "2 min ago" },
  { id: "AL-440", severity: "high", title: "Water contamination confirmed", zone: "Govandi East", time: "18 min ago" },
  { id: "AL-439", severity: "medium", title: "Structural risk reported", zone: "Kurla West", time: "1 hr ago" },
  { id: "AL-438", severity: "low", title: "Sanitation backlog", zone: "Mankhurd", time: "3 hr ago" },
  { id: "AL-437", severity: "high", title: "Electrical exposure, Lane 6", zone: "Bandra East Slums", time: "5 hr ago" },
];

export const INCIDENT_TREND = [
  { name: "Mon", incidents: 12 },
  { name: "Tue", incidents: 18 },
  { name: "Wed", incidents: 9 },
  { name: "Thu", incidents: 22 },
  { name: "Fri", incidents: 15 },
  { name: "Sat", incidents: 27 },
  { name: "Sun", incidents: 19 },
];

export const ZONE_LOAD = [
  { name: "Dharavi", open: 8, resolved: 14 },
  { name: "Govandi", open: 5, resolved: 9 },
  { name: "Kurla", open: 3, resolved: 11 },
  { name: "Mankhurd", open: 6, resolved: 6 },
];

export const SEVERITY_MIX = [
  { name: "Critical", value: 8, color: "hsl(var(--chart-2))" },
  { name: "High", value: 14, color: "hsl(var(--chart-3))" },
  { name: "Medium", value: 22, color: "hsl(var(--chart-1))" },
  { name: "Low", value: 30, color: "hsl(var(--chart-5))" },
];

export const VOLUNTEER_TEAMS = [
  { id: "T-A", name: "Team Alpha", members: 6, zone: "Dharavi Sector 4", status: "active", tasksDone: 34 },
  { id: "T-B", name: "Team Bravo", members: 4, zone: "Govandi East", status: "active", tasksDone: 28 },
  { id: "T-C", name: "Team Charlie", members: 5, zone: "Mankhurd", status: "off-duty", tasksDone: 41 },
  { id: "T-D", name: "Team Delta", members: 3, zone: "Kurla West", status: "active", tasksDone: 19 },
  { id: "T-E", name: "Team Echo", members: 5, zone: "Unassigned", status: "standby", tasksDone: 22 },
];

export const INCIDENT_FEED = [
  { id: "INC-2291", zone: "Dharavi Sector 4", type: "Fire hazard", severity: "critical", team: "Team Alpha", eta: "4 min", time: "2 min ago" },
  { id: "INC-2290", zone: "Govandi East", type: "Water contamination", severity: "high", team: "Team Bravo", eta: "12 min", time: "18 min ago" },
  { id: "INC-2289", zone: "Kurla West", type: "Structural risk", severity: "medium", team: "Unassigned", eta: "—", time: "42 min ago" },
  { id: "INC-2288", zone: "Mankhurd", type: "Sanitation", severity: "low", team: "Team Charlie", eta: "resolved", time: "1 hr ago" },
  { id: "INC-2287", zone: "Bandra East Slums", type: "Electrical hazard", severity: "high", team: "Team Echo", eta: "20 min", time: "3 hr ago" },
];

export const APPROVAL_QUEUE = [
  {
    id: "APR-118",
    type: "Volunteer registration",
    summary: "Ayesha Khan — background verified, requesting Govandi East assignment",
    requestedBy: "HR Onboarding",
    time: "12 min ago",
  },
  {
    id: "APR-117",
    type: "Resource allocation",
    summary: "50 medical kits requested for Dharavi Sector 4 response",
    requestedBy: "Team Alpha",
    time: "40 min ago",
  },
  {
    id: "APR-116",
    type: "Zone reassignment",
    summary: "Move Team Delta from Kurla West to Chembur North",
    requestedBy: "Ops Coordinator",
    time: "1 hr ago",
  },
  {
    id: "APR-115",
    type: "Budget release",
    summary: "Release ₹80,000 for sanitation equipment — Mankhurd zone",
    requestedBy: "Finance Desk",
    time: "2 hr ago",
  },
];

export const AI_RECOMMENDATIONS = [
  {
    id: "REC-01",
    title: "Increase patrol frequency in Govandi East",
    detail: "Incident density up 34% over the last 7 days — pattern consistent with pre-monsoon drainage failures.",
    confidence: 92,
  },
  {
    id: "REC-02",
    title: "Pre-position medical kits near Dharavi Sector 4",
    detail: "Fire-hazard reports cluster within 200m of the community hall between 6–9pm.",
    confidence: 87,
  },
  {
    id: "REC-03",
    title: "Reassign Team Echo from standby to Kurla West",
    detail: "Kurla West's open-to-resolved ratio has the widest gap of any active zone this week.",
    confidence: 78,
  },
];
