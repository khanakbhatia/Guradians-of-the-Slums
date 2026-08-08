// All notifications here are DUMMY / STATIC. The "real-time" behavior
// is simulated client-side (see NotificationContext) — there is no
// websocket, push service, or backend involved.

export const NOTIFICATION_TYPES = {
  incident: { label: "Incident", icon: "Siren" },
  team: { label: "Team", icon: "UserPlus" },
  system: { label: "System", icon: "Info" },
  zone: { label: "Zone", icon: "MapPin" },
  task: { label: "Task", icon: "ClipboardCheck" },
};

export const PRIORITY_META = {
  critical: { label: "Critical", variant: "destructive", toastVariant: "destructive" },
  high: { label: "High", variant: "warning", toastVariant: "warning" },
  medium: { label: "Medium", variant: "primary", toastVariant: "info" },
  low: { label: "Low", variant: "neutral", toastVariant: "neutral" },
};

export const INITIAL_NOTIFICATIONS = [
  {
    id: "n1",
    type: "incident",
    priority: "critical",
    title: "Fire hazard reported",
    body: "Dharavi Sector 4 — verified by 2 residents",
    time: "2m ago",
    read: false,
  },
  {
    id: "n2",
    type: "team",
    priority: "medium",
    title: "Team Bravo dispatched",
    body: "En route to Govandi East, ETA 12 min",
    time: "18m ago",
    read: false,
  },
  {
    id: "n3",
    type: "zone",
    priority: "high",
    title: "New zone advisory",
    body: "Heavy rain advisory issued for Sector 4",
    time: "1h ago",
    read: false,
  },
  {
    id: "n4",
    type: "task",
    priority: "low",
    title: "Weekly report ready",
    body: "Your zone summary for last week is available",
    time: "5h ago",
    read: true,
  },
  {
    id: "n5",
    type: "system",
    priority: "low",
    title: "Scheduled maintenance",
    body: "Platform will be briefly unavailable at 2 AM IST",
    time: "1 day ago",
    read: true,
  },
];

/** Templates the simulator randomly draws from to "arrive" over time. */
export const NOTIFICATION_POOL = [
  { type: "incident", priority: "critical", title: "Structural collapse risk", body: "Lane 9, Bandra East Slums — immediate verification needed" },
  { type: "incident", priority: "high", title: "Electrical hazard reported", body: "Exposed wiring near community tap, Kurla West" },
  { type: "team", priority: "medium", title: "Team Charlie back on duty", body: "Available for new assignments in Mankhurd" },
  { type: "team", priority: "low", title: "Volunteer check-in", body: "Ayesha Khan checked in for Govandi East shift" },
  { type: "zone", priority: "high", title: "Water contamination spreading", body: "2 additional reports near the original site" },
  { type: "zone", priority: "low", title: "Zone advisory lifted", body: "Heavy rain advisory for Sector 4 has been cleared" },
  { type: "task", priority: "medium", title: "Approval requested", body: "Resource allocation pending your review" },
  { type: "system", priority: "low", title: "Weekly digest ready", body: "3 hazards resolved across your zones this week" },
  { type: "incident", priority: "medium", title: "Sanitation backlog reported", body: "Deonar Relief Camp — pickup overdue by 2 days" },
];
