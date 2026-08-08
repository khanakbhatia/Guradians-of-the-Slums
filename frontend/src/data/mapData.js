// Everything here is STATIC / DUMMY data — no backend, no live feed.
// Coordinates are illustrative points around the Mumbai pilot zones
// used elsewhere in the app (see MAP_DEFAULTS in src/constants).

/** [lat, lng, intensity 0–1] tuples consumed by leaflet.heat. */
export const HEATMAP_POINTS = [
  [19.043, 72.857, 0.9], [19.045, 72.859, 0.8], [19.041, 72.855, 0.7],
  [19.047, 72.861, 0.6], [19.044, 72.853, 0.85], [19.039, 72.858, 0.5],
  [19.055, 72.916, 0.75], [19.057, 72.918, 0.65], [19.053, 72.914, 0.55],
  [19.0728, 72.8794, 0.5], [19.075, 72.881, 0.4], [19.070, 72.877, 0.45],
  [19.049, 72.933, 0.35], [19.051, 72.935, 0.3],
  [19.062, 72.900, 0.25], [19.064, 72.902, 0.2],
  [19.064, 72.848, 0.55], [19.066, 72.850, 0.45],
];

export const SHELTERS = [
  { id: "SH-1", name: "Community Hall — Sector 3", lat: 19.0445, lng: 72.8558, capacity: "120 / 200" },
  { id: "SH-2", name: "Municipal School #12", lat: 19.0405, lng: 72.86, capacity: "60 / 150" },
  { id: "SH-3", name: "Govandi Community Hall", lat: 19.0562, lng: 72.9175, capacity: "62 / 200" },
  { id: "SH-4", name: "Deonar Relief Camp", lat: 19.0445, lng: 72.916, capacity: "210 / 300" },
];

export const HOSPITALS = [
  { id: "HO-1", name: "Sion Hospital Annex", lat: 19.0431, lng: 72.8619, type: "General" },
  { id: "HO-2", name: "Shivaji Nagar Health Post", lat: 19.0601, lng: 72.9204, type: "Primary care" },
  { id: "HO-3", name: "Rajawadi Municipal Hospital", lat: 19.0712, lng: 72.9008, type: "General" },
];

export const SCHOOLS = [
  { id: "SC-1", name: "Municipal School #12", lat: 19.0405, lng: 72.86, level: "Primary" },
  { id: "SC-2", name: "M-Ward Municipal School", lat: 19.0518, lng: 72.913, level: "Secondary" },
  { id: "SC-3", name: "Kurla West High School", lat: 19.0705, lng: 72.8768, level: "Secondary" },
];

/** Static GeoJSON FeatureCollection — a small illustrative road network. */
export const ROADS_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Sion-Mahim Link Road" },
      geometry: {
        type: "LineString",
        coordinates: [
          [72.853, 19.040], [72.857, 19.043], [72.861, 19.046], [72.865, 19.049],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Govandi Station Road" },
      geometry: {
        type: "LineString",
        coordinates: [
          [72.910, 19.052], [72.914, 19.055], [72.918, 19.058], [72.921, 19.061],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "LBS Marg (Kurla stretch)" },
      geometry: {
        type: "LineString",
        coordinates: [
          [72.872, 19.066], [72.876, 19.070], [72.879, 19.073], [72.883, 19.076],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Mankhurd-Chembur Link" },
      geometry: {
        type: "LineString",
        coordinates: [
          [72.928, 19.046], [72.932, 19.049], [72.936, 19.052], [72.900, 19.062],
        ],
      },
    },
  ],
};

export const MAP_LAYER_CONFIG = [
  { id: "incidents", label: "Incidents", defaultOn: true },
  { id: "heatmap", label: "Risk heatmap", defaultOn: true },
  { id: "shelters", label: "Shelters", defaultOn: true },
  { id: "hospitals", label: "Hospitals", defaultOn: true },
  { id: "schools", label: "Schools", defaultOn: true },
  { id: "roads", label: "Roads", defaultOn: false },
];
