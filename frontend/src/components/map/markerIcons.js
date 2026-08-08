import L from "leaflet";

// Flat glyph-only pins — no glow ring, no oversized halo. Colors match
// MapLegend's mapping exactly: incident=destructive, shelter=primary,
// hospital=info, school=warning.
const GLYPHS = {
  shelter: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  hospital: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8v8M8 12h8"/>',
  school: '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12.5V17c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5"/>',
  incident: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4"/><path d="M12 17.5h.01"/>',
};

const COLORS = {
  incident: "hsl(355, 55%, 48%)", // destructive
  shelter: "hsl(208, 38%, 50%)", // primary
  hospital: "hsl(185, 35%, 42%)", // info
  school: "hsl(36, 65%, 47%)", // warning
};

const SIZE = 18;
const SIZE_SELECTED = 24;

/**
 * Builds a small flat SVG pin divIcon — no external marker image
 * assets, no glow ring. `selected` renders a slightly larger pin with
 * a stronger border so the active marker is still clearly flat, not
 * glowing.
 */
export function categoryIcon(category, selected = false) {
  const color = COLORS[category];
  const glyph = GLYPHS[category];
  const size = selected ? SIZE_SELECTED : SIZE;
  const glyphSize = selected ? 13 : 10;

  const html = `
    <div style="
      display:flex; align-items:center; justify-content:center;
      width:${size}px; height:${size}px; border-radius:9999px;
      background:${color};
      border:${selected ? 2 : 1.5}px solid hsl(0 0% 100% / 0.9);
      box-shadow:0 1px 2px rgba(0,0,0,0.35);
    ">
      <svg width="${glyphSize}" height="${glyphSize}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        ${glyph}
      </svg>
    </div>`;

  return L.divIcon({
    html,
    className: "gots-marker-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export const CATEGORY_COLOR = COLORS;
export const CATEGORY_LABEL = {
  shelter: "Shelter",
  hospital: "Hospital",
  school: "School",
  incident: "Incident",
};
