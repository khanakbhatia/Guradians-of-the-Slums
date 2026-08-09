import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import api from "@/lib/axios";
import { ENDPOINTS } from "@/api/endpoints";
import { QK } from "@/api/queryKeys";
import { SHELTERS } from "@/data/mapData";
import { useAuth } from "@/context/AuthContext";

// 15s, not 5s — see the note in useAuthorityQueries.js. Aggressive polling
// across all four dashboards was exhausting the API's global rate limit and
// surfacing as "Too many requests" in the citizen reports panel.
const LIVE_REPORT_REFETCH_MS = 15000;

// ---------------------------------------------------------------------------
// Citizen "area context" panels.
//
// These four cards previously resolved to an empty result and always
// rendered their "no data" state, because the backend has no dedicated
// /citizen/* resource for them. Rather than leave the dashboard blank, each
// is now backed by the most truthful source available:
//
//   Risk status     - REAL backend data. Derived from GET /risk-zones (which
//                     any authenticated role may read; only writes are
//                     authority/admin-gated), picking the zone nearest the
//                     citizen. Score, level, factors and timestamp are the
//                     actual persisted RiskZone fields.
//   Nearby shelters - Static shelter fixtures from src/data/mapData.js (the
//                     same ones the full map renders, so the list and the map
//                     agree), with distance computed live against the
//                     citizen's own coordinates.
//   Contacts / tips - Static reference content. These are genuinely static in
//                     a real product too: national emergency numbers and
//                     standing safety guidance don't come from a database.
//
// Nothing here invents a number that pretends to be a live measurement.
// ---------------------------------------------------------------------------

/** Fallback centre (Dharavi) when a citizen has no saved coordinates. */
const DEFAULT_CITIZEN_COORDS = { lat: 19.038, lng: 72.8506 };

/** Approximate km between two lat/lng points (Haversine). */
function distanceKm(aLat, aLng, bLat, bLng) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** "3 hours ago" style label from an ISO timestamp. */
function relativeTime(iso) {
  if (!iso) return "recently";
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

/** Read the citizen's own coordinates off their profile, if they have any. */
function useCitizenCoords() {
  const { user } = useAuth();
  const coords = user?.location?.coordinates;
  if (Array.isArray(coords) && coords.length === 2) {
    return { lng: coords[0], lat: coords[1] };
  }
  return DEFAULT_CITIZEN_COORDS;
}

/**
 * Area safety status for the citizen's nearest risk zone — real RiskZone
 * data, not a fixture.
 */
export function useRiskStatus() {
  const { lat, lng } = useCitizenCoords();

  return useQuery({
    queryKey: [...QK.citizenRiskStatus, lat, lng],
    queryFn: async () => {
      const zones = (await api.get(ENDPOINTS.AUTHORITY_RISK_ZONES, { params: { limit: 100 } })).data.riskZones || [];
      if (zones.length === 0) return null;

      // Nearest zone by polygon centroid.
      let nearest = null;
      let best = Infinity;
      for (const z of zones) {
        const ring = z.geometry?.coordinates?.[0];
        if (!ring?.length) continue;
        const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
        const cy = ring.reduce((s, p) => s + p[1], 0) / ring.length;
        const d = distanceKm(lat, lng, cy, cx);
        if (d < best) {
          best = d;
          nearest = z;
        }
      }
      if (!nearest) return null;

      // RiskStatus.jsx's LEVEL_LABEL/LEVEL_VARIANT only define low/moderate/
      // high, so 'critical' must be folded into 'high' or the chip renders
      // blank.
      const level = nearest.riskLevel === "critical" ? "high" : nearest.riskLevel;

      return {
        zone: nearest.name || nearest.settlement || nearest.blockId,
        score: Math.round(nearest.riskScore ?? 0),
        level,
        updated: relativeTime(nearest.updatedAt || nearest.lastAnalyzedAt),
        factors: (nearest.contributingFactors || [])
          .slice(0, 3)
          .map((f) => f.factor.replace(/_/g, " ")),
      };
    },
  });
}

/**
 * Nearest shelters, using the same fixtures the full map renders so the two
 * views never disagree. Distance is computed live from the citizen's own
 * coordinates; occupancy comes from the fixture's "used / total" string.
 */
export function useNearbyShelters() {
  const { lat, lng } = useCitizenCoords();

  return useQuery({
    queryKey: [...QK.citizenShelters, lat, lng],
    queryFn: async () =>
      SHELTERS.map((s) => {
        const [used, total] = String(s.capacity)
          .split("/")
          .map((n) => Number(n.trim()));
        return {
          id: s.id,
          name: s.name,
          distanceKm: distanceKm(lat, lng, s.lat, s.lng).toFixed(1),
          capacity: s.capacity,
          status: used >= total ? "full" : "open",
        };
      })
        .sort((a, b) => Number(a.distanceKm) - Number(b.distanceKm))
        .slice(0, 4),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Indian national emergency numbers plus the BMC disaster helpline.
 * Static by nature — these are published constants, not database rows.
 * `icon` keys must match EmergencyContacts.jsx's ICONS map.
 */
const EMERGENCY_CONTACTS = [
  { id: "ec-1", label: "Emergency (all-in-one)", number: "112", icon: "ShieldAlert" },
  { id: "ec-2", label: "Police", number: "100", icon: "Shield" },
  { id: "ec-3", label: "Fire brigade", number: "101", icon: "Flame" },
  { id: "ec-4", label: "Ambulance", number: "108", icon: "HeartPulse" },
  { id: "ec-5", label: "BMC disaster control", number: "1916", icon: "Phone" },
  { id: "ec-6", label: "Women's helpline", number: "1091", icon: "UserRound" },
];

export function useEmergencyContacts() {
  return useQuery({
    queryKey: QK.citizenContacts,
    queryFn: async () => EMERGENCY_CONTACTS,
    staleTime: Infinity,
  });
}

/**
 * Standing safety guidance, matching the hazard types this platform tracks
 * (flood, fire, storm, power). Static reference content — `icon` keys must
 * match DisasterTips.jsx's ICONS map.
 */
const DISASTER_TIPS = [
  {
    id: "tip-flood",
    icon: "CloudRain",
    title: "During flooding",
    body: "Move to higher ground before water rises. Never walk or wade through moving water — 15 cm is enough to knock you down. Avoid flooded roads entirely.",
  },
  {
    id: "tip-fire",
    icon: "Flame",
    title: "If a fire spreads",
    body: "Stay low under smoke and leave immediately by the nearest clear lane. Do not stop to collect belongings. Call 101 once you are safely outside.",
  },
  {
    id: "tip-storm",
    icon: "Wind",
    title: "Heavy wind & storms",
    body: "Stay indoors and away from windows, loose sheeting and hoardings. Keep clear of electric poles and fallen wires after the wind drops.",
  },
  {
    id: "tip-power",
    icon: "BatteryCharging",
    title: "Before you lose power",
    body: "Charge phones and power banks early in the alert. Keep a torch, drinking water and any daily medication within reach.",
  },
];

export function useDisasterTips() {
  return useQuery({
    queryKey: QK.citizenTips,
    queryFn: async () => DISASTER_TIPS,
    staleTime: Infinity,
  });
}

/**
 * "Alerts" has no dedicated backend resource — mapped to the same
 * /notifications endpoint the notifications feed uses (the closest real
 * concept: advisories the citizen has been sent). EmergencyAlerts.jsx
 * reads the real Notification fields (title/message/priority/createdAt).
 */
export function useCitizenAlerts() {
  return useQuery({
    queryKey: QK.citizenAlerts,
    queryFn: async () => (await api.get(ENDPOINTS.NOTIFICATIONS)).data.notifications,
  });
}

/** Notifications feed — same endpoint every role uses. */
export function useCitizenNotifications() {
  return useQuery({
    queryKey: QK.citizenNotifications,
    queryFn: async () => (await api.get(ENDPOINTS.NOTIFICATIONS)).data.notifications,
    refetchInterval: LIVE_REPORT_REFETCH_MS,
  });
}

export function useCitizenReports() {
  return useQuery({
    queryKey: QK.citizenReports,
    queryFn: async () => (await api.get(ENDPOINTS.CITIZEN_REPORTS)).data.reports,
    refetchInterval: LIVE_REPORT_REFETCH_MS,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    // PATCH, not POST — see endpoints.js.
    mutationFn: async (id) => (await api.patch(ENDPOINTS.notificationRead(id))).data,
    onMutate: async (id) => {
      // optimistic: flip `isRead` locally right away, don't wait on the network
      queryClient.setQueryData(QK.citizenNotifications, (prev) =>
        Array.isArray(prev) ? prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)) : prev
      );
    },
  });
}

/**
 * Submit a new hazard report. Citizens create CitizenReports, not
 * Incidents — POST /incidents is authority/admin-only and would 403 for
 * this role. Payload must include hazardType + description + location
 * (see ReportIncidentDialog.jsx for the mapping from UI labels to the
 * backend's hazardType enum).
 */
export function useReportIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ photos = [], ...payload }) => {
      const created = (await api.post(ENDPOINTS.CITIZEN_REPORTS, payload)).data.report;
      if (photos.length === 0) return created;

      const formData = new FormData();
      for (const photo of photos) {
        formData.append("photos", photo);
      }
      return (await api.post(ENDPOINTS.citizenReportImages(created.id), formData)).data.report;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.citizenReports });
      queryClient.invalidateQueries({ queryKey: QK.citizenNotifications });
      queryClient.invalidateQueries({ queryKey: QK.authorityApprovals });
      queryClient.invalidateQueries({ queryKey: QK.authorityOverview });
      queryClient.invalidateQueries({ queryKey: QK.volunteerNearbyRequests });
    },
  });
}
