// All data here is DUMMY / STATIC — no backend integrated.

export const USER_ROLE_BREAKDOWN = [
  { name: "Citizens", value: 4210, color: "hsl(var(--chart-1))" },
  { name: "Volunteers", value: 486, color: "hsl(var(--chart-2))" },
  { name: "Authorities", value: 12, color: "hsl(var(--chart-3))" },
  { name: "Admins", value: 3, color: "hsl(var(--chart-4))" },
];

export const SIGNUP_TREND = [
  { name: "Mon", signups: 18 },
  { name: "Tue", signups: 24 },
  { name: "Wed", signups: 15 },
  { name: "Thu", signups: 31 },
  { name: "Fri", signups: 22 },
  { name: "Sat", signups: 12 },
  { name: "Sun", signups: 9 },
];

export const RECENT_ACTIVITY = [
  { id: "a1", actor: "Rahul Mehta", action: "Approved resource allocation for Dharavi Sector 4", time: "6 min ago" },
  { id: "a2", actor: "System", action: "Nightly backup completed successfully", time: "1 hr ago" },
  { id: "a3", actor: "Ayesha Khan", action: "Registered as a new volunteer", time: "2 hr ago" },
  { id: "a4", actor: "Meera Iyer", action: "Updated platform notification settings", time: "5 hr ago" },
  { id: "a5", actor: "System", action: "Flagged 2 duplicate incident reports for review", time: "8 hr ago" },
];

export const SYSTEM_STATUS = [
  { id: "s1", label: "API", status: "operational" },
  { id: "s2", label: "Map tiles", status: "operational" },
  { id: "s3", label: "Notifications", status: "operational" },
  { id: "s4", label: "AI triage (Watson)", status: "degraded" },
];
