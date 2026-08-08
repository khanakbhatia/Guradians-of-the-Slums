// All data here is DUMMY / STATIC — no backend, no live feed. Keyed
// records exist for the IDs already shown in the Authority incident
// feed; any other ID falls back to a generated placeholder so the page
// never breaks when navigated to directly.

const RECORDS = {
  "INC-2291": {
    id: "INC-2291",
    title: "Fire hazard escalation",
    type: "Fire hazard",
    zone: "Dharavi Sector 4",
    severity: "critical",
    status: "dispatched",
    reportedBy: "Citizen report — Sam Fernandes",
    reportedAt: "Today, 2:12 PM",
    coordinates: { lat: 19.043, lng: 72.857 },
    description:
      "Exposed cooking-gas cylinder near the community hall reported to be leaking, with visible sparking from an adjacent electrical junction box. Multiple residents in the immediate vicinity.",
    images: [
      { id: "img1", url: "https://picsum.photos/seed/inc2291a/480/320", caption: "Junction box, initial report" },
      { id: "img2", url: "https://picsum.photos/seed/inc2291b/480/320", caption: "Wider street view" },
      { id: "img3", url: "https://picsum.photos/seed/inc2291c/480/320", caption: "Follow-up photo, 2:40 PM" },
    ],
    riskScore: {
      score: 91,
      level: "high",
      factors: [
        { label: "Proximity to gas source", value: "< 2m" },
        { label: "Population density", value: "High" },
        { label: "Prior incidents (zone)", value: "3 this month" },
      ],
    },
    aiExplanation: {
      summary:
        "Classified as high-severity based on hazard type co-occurrence (gas + electrical) and dense surrounding population within the reported radius.",
      signals: [
        { label: "Hazard co-occurrence", detail: "Gas leak + electrical spark reported together", weight: 38 },
        { label: "Population density", value: "High", detail: "Sector 4 is in the top decile for density citywide", weight: 27 },
        { label: "Historical pattern", detail: "3 similar reports in this zone in the last 30 days", weight: 21 },
        { label: "Report language urgency", detail: "Reporter text flagged as high-urgency", weight: 14 },
      ],
      confidence: 92,
    },
    timeline: [
      { id: "t1", label: "Reported by citizen", time: "2:12 PM", status: "done" },
      { id: "t2", label: "AI triage — classified critical", time: "2:13 PM", status: "done" },
      { id: "t3", label: "Verified by volunteer (Team Alpha)", time: "2:19 PM", status: "done" },
      { id: "t4", label: "Dispatched to field team", time: "2:24 PM", status: "current" },
      { id: "t5", label: "Resolved & closed", time: "—", status: "pending" },
    ],
    assignedVolunteers: [
      { id: "v1", name: "Priya Nair", role: "Team Lead", team: "Team Alpha", phone: "+91 98200 11122" },
      { id: "v2", name: "Rohan Mehta", role: "Field Responder", team: "Team Alpha", phone: "+91 98200 33344" },
    ],
    history: [
      { id: "h1", actor: "System", action: "Incident created from citizen report", time: "2:12 PM" },
      { id: "h2", actor: "IBM Watson (AI)", action: "Severity classified as critical (92% confidence)", time: "2:13 PM" },
      { id: "h3", actor: "Priya Nair", action: "Verified on-site, confirmed gas + electrical hazard", time: "2:19 PM" },
      { id: "h4", actor: "Rahul Mehta (Authority)", action: "Dispatched Team Alpha", time: "2:24 PM" },
    ],
  },

  "INC-2290": {
    id: "INC-2290",
    title: "Water contamination confirmed",
    type: "Water contamination",
    zone: "Govandi East",
    severity: "high",
    status: "in-progress",
    reportedBy: "Citizen report — Anonymous",
    reportedAt: "Today, 1:40 PM",
    coordinates: { lat: 19.055, lng: 72.916 },
    description:
      "Discoloured water reported from the community tap on Lane 8. Residents report a foul smell; several households have stopped drawing water from this source.",
    images: [
      { id: "img1", url: "https://picsum.photos/seed/inc2290a/480/320", caption: "Community tap, Lane 8" },
      { id: "img2", url: "https://picsum.photos/seed/inc2290b/480/320", caption: "Water sample close-up" },
    ],
    riskScore: {
      score: 68,
      level: "moderate",
      factors: [
        { label: "Households affected", value: "~40" },
        { label: "Nearest medical post", value: "0.9 km" },
        { label: "Water source type", value: "Shared municipal line" },
      ],
    },
    aiExplanation: {
      summary:
        "Moderate-high severity driven by the number of households sharing this water source and the absence of an alternate supply point nearby.",
      signals: [
        { label: "Households affected", detail: "Estimated 40 households on this line", weight: 34 },
        { label: "No alternate source", detail: "Nearest backup tap is 600m away", weight: 26 },
        { label: "Symptom reports", detail: "2 residents reported stomach illness in the last 24h", weight: 25 },
        { label: "Seasonal pattern", detail: "Contamination reports rise during monsoon", weight: 15 },
      ],
      confidence: 84,
    },
    timeline: [
      { id: "t1", label: "Reported by citizen", time: "1:40 PM", status: "done" },
      { id: "t2", label: "AI triage — classified high", time: "1:41 PM", status: "done" },
      { id: "t3", label: "Verified by volunteer (Team Bravo)", time: "1:58 PM", status: "done" },
      { id: "t4", label: "Field team en route", time: "2:05 PM", status: "current" },
      { id: "t5", label: "Resolved & closed", time: "—", status: "pending" },
    ],
    assignedVolunteers: [
      { id: "v3", name: "Fatima Sheikh", role: "Team Lead", team: "Team Bravo", phone: "+91 98200 55566" },
    ],
    history: [
      { id: "h1", actor: "System", action: "Incident created from citizen report", time: "1:40 PM" },
      { id: "h2", actor: "IBM Watson (AI)", action: "Severity classified as high (84% confidence)", time: "1:41 PM" },
      { id: "h3", actor: "Fatima Sheikh", action: "Verified on-site, collected water sample", time: "1:58 PM" },
      { id: "h4", actor: "Rahul Mehta (Authority)", action: "Dispatched Team Bravo", time: "2:05 PM" },
    ],
  },
};

const SEVERITIES = ["low", "medium", "high", "critical"];

/** Deterministic fallback so any unknown :id still renders a full page. */
function buildFallback(id) {
  const hash = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const severity = SEVERITIES[hash % SEVERITIES.length];
  const score = 35 + (hash % 60);

  return {
    id,
    title: "Reported hazard",
    type: "General hazard",
    zone: "Unassigned zone",
    severity,
    status: "open",
    reportedBy: "Citizen report — Anonymous",
    reportedAt: "Recently",
    coordinates: { lat: 19.076, lng: 72.8777 },
    description: "No detailed record found for this incident ID — showing a generated preview.",
    images: [{ id: "img1", url: `https://picsum.photos/seed/${id}/480/320`, caption: "Preview image" }],
    riskScore: {
      score,
      level: score >= 70 ? "high" : score >= 40 ? "moderate" : "low",
      factors: [{ label: "Data availability", value: "Limited" }],
    },
    aiExplanation: {
      summary: "No live model output available for this record — this is a placeholder explanation.",
      signals: [{ label: "Preview mode", detail: "This incident has no stored AI signals", weight: 100 }],
      confidence: 50,
    },
    timeline: [{ id: "t1", label: "Reported", time: "—", status: "current" }],
    assignedVolunteers: [],
    history: [{ id: "h1", actor: "System", action: "Incident record generated (preview)", time: "—" }],
  };
}

export function getIncidentDetails(id) {
  return RECORDS[id] ?? buildFallback(id);
}

export const STATUS_OPTIONS = ["open", "in-progress", "dispatched", "resolved"];
