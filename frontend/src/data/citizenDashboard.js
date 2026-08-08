// All data on this page is DUMMY / STATIC. No backend is integrated —
// swap these exports for real API/query results later without touching
// the components that consume them.

export const RISK_STATUS = {
  level: "moderate", // low | moderate | high
  score: 58,
  zone: "Dharavi Sector 4",
  updated: "12 min ago",
  factors: [
    "Heavy rain forecast in the next 6 hours",
    "2 open drainage reports within 300m",
    "No active fire hazards nearby",
  ],
};

export const NEARBY_SHELTERS = [
  { id: "SH-1", name: "Community Hall — Sector 3", lat: 19.0445, lng: 72.8558, distanceKm: 0.4, capacity: "120 / 200", status: "open" },
  { id: "SH-2", name: "Municipal School #12", lat: 19.0405, lng: 72.8600, distanceKm: 0.9, capacity: "60 / 150", status: "open" },
  { id: "SH-3", name: "St. Mary's Relief Center", lat: 19.0470, lng: 72.8520, distanceKm: 1.3, capacity: "180 / 180", status: "full" },
];

export const EMERGENCY_ALERTS = [
  { id: "EA-1", severity: "warning", title: "Heavy rain advisory", body: "Avoid low-lying paths near Sector 4 until further notice.", time: "20 min ago" },
  { id: "EA-2", severity: "info", title: "Water tanker rerouted", body: "Today's supply will arrive at Lane 8 instead of Lane 6.", time: "2 hr ago" },
  { id: "EA-3", severity: "destructive", title: "Electrical hazard nearby", body: "Exposed wiring reported 250m from your registered address.", time: "4 hr ago" },
];

export const EMERGENCY_CONTACTS = [
  { id: "c1", label: "Police", number: "100", icon: "Shield" },
  { id: "c2", label: "Fire Brigade", number: "101", icon: "Flame" },
  { id: "c3", label: "Ambulance", number: "102", icon: "HeartPulse" },
  { id: "c4", label: "Local Ward Helpline", number: "1800-123-4567", icon: "Phone" },
  { id: "c5", label: "Disaster Management Cell", number: "1070", icon: "ShieldAlert" },
  { id: "c6", label: "Women's Helpline", number: "1091", icon: "UserRound" },
];

export const DISASTER_TIPS = [
  {
    id: "t1",
    title: "During heavy rain",
    body: "Avoid walking through moving water. Move valuables and important documents to higher ground early.",
    icon: "CloudRain",
  },
  {
    id: "t2",
    title: "In case of fire",
    body: "Stay low to avoid smoke, alert neighbors, and use the nearest marked exit — never use elevators.",
    icon: "Flame",
  },
  {
    id: "t3",
    title: "If you smell gas",
    body: "Don't switch on lights or flames. Open windows, leave the area, and report it immediately.",
    icon: "Wind",
  },
  {
    id: "t4",
    title: "Before an emergency",
    body: "Keep a charged phone, torch, ID copies, and a small water supply ready at all times.",
    icon: "BatteryCharging",
  },
];

export const RECENT_NOTIFICATIONS = [
  { id: "n1", title: "Your report was verified", body: "R-563 (garbage pileup) confirmed by a volunteer", time: "10 min ago", read: false },
  { id: "n2", title: "Shelter capacity updated", body: "St. Mary's Relief Center is now at full capacity", time: "1 hr ago", read: false },
  { id: "n3", title: "Advisory issued for your zone", body: "Heavy rain expected tonight in Sector 4", time: "3 hr ago", read: true },
  { id: "n4", title: "Report resolved", body: "R-551 (open drain) has been fixed", time: "2 days ago", read: true },
];
