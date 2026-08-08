// All data on this page is DUMMY / STATIC. No backend is integrated —
// swap these exports for real API/query results later without touching
// the components that consume them.

export const VOLUNTEER_SCORE = {
  score: 742,
  level: "Gold Responder",
  levelProgress: 68, // % to next level
  rank: 4,
  tasksCompleted: 41,
  hoursLogged: 96,
  streakDays: 12,
};

export const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const AVAILABILITY_DEFAULT = {
  activeNow: true,
  days: { Mon: true, Tue: true, Wed: false, Thu: true, Fri: true, Sat: false, Sun: false },
};

/** Unified task list — status drives which section a task renders in. */
export const INITIAL_TASKS = [
  {
    id: "T-104",
    title: "Verify water contamination report",
    zone: "Govandi East",
    priority: "high",
    status: "assigned",
    eta: "Today, 4:00 PM",
  },
  {
    id: "T-105",
    title: "Escort medical team to Sector 4",
    zone: "Dharavi",
    priority: "critical",
    status: "assigned",
    eta: "Today, 5:30 PM",
  },
  {
    id: "T-103",
    title: "Distribute flood advisory notices",
    zone: "Kurla West",
    priority: "medium",
    status: "accepted",
    eta: "Today, 6:00 PM",
  },
  {
    id: "T-098",
    title: "Weekly sanitation walkthrough",
    zone: "Mankhurd",
    priority: "low",
    status: "completed",
    completedAt: "Yesterday, 3:10 PM",
  },
  {
    id: "T-091",
    title: "Distribute water purification tablets",
    zone: "Chembur North",
    priority: "medium",
    status: "completed",
    completedAt: "2 days ago",
  },
  {
    id: "T-084",
    title: "Structural safety check, Lane 9",
    zone: "Bandra East Slums",
    priority: "high",
    status: "completed",
    completedAt: "4 days ago",
  },
];

export const TASK_TIMELINE = [
  { id: "e1", time: "2:14 PM", title: "Task T-104 assigned to you", type: "assigned" },
  { id: "e2", time: "1:40 PM", title: "Task T-103 accepted", type: "accepted" },
  { id: "e3", time: "11:05 AM", title: "Task T-098 marked complete", type: "completed" },
  { id: "e4", time: "Yesterday", title: "Checked in for Mankhurd zone walkthrough", type: "checkin" },
  { id: "e5", time: "2 days ago", title: "Task T-091 marked complete", type: "completed" },
];

export const LEADERBOARD = [
  { id: "u1", name: "Priya Nair", score: 1120, tasksCompleted: 63 },
  { id: "u2", name: "Arjun Desai", score: 986, tasksCompleted: 54 },
  { id: "u3", name: "Fatima Sheikh", score: 891, tasksCompleted: 49 },
  { id: "u4", name: "Ayesha Khan", score: 742, tasksCompleted: 41, isCurrentUser: true },
  { id: "u5", name: "Rohan Mehta", score: 705, tasksCompleted: 39 },
  { id: "u6", name: "Neha Gupta", score: 668, tasksCompleted: 36 },
];

export const NEARBY_REQUESTS = [
  {
    id: "REQ-771",
    title: "Exposed electrical wiring reported",
    zone: "Govandi East",
    distanceKm: 0.6,
    priority: "high",
    reportedBy: "Citizen report",
    time: "6 min ago",
  },
  {
    id: "REQ-770",
    title: "Garbage pileup blocking pathway",
    zone: "Kurla West",
    distanceKm: 1.1,
    priority: "low",
    reportedBy: "Citizen report",
    time: "22 min ago",
  },
  {
    id: "REQ-769",
    title: "Suspected structural crack near school",
    zone: "Dharavi Sector 3",
    distanceKm: 1.8,
    priority: "medium",
    reportedBy: "Citizen report",
    time: "40 min ago",
  },
];
