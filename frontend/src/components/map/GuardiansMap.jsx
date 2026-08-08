import { useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, ZoomControl } from "react-leaflet";

import { MAP_DEFAULTS } from "@/constants";
import {
  HEATMAP_POINTS,
  HOSPITALS,
  MAP_LAYER_CONFIG,
  SCHOOLS,
  SHELTERS,
} from "@/data/mapData";
import { useRiskZones } from "@/hooks/queries/useAuthorityQueries";

import HeatmapLayer from "@/components/map/HeatmapLayer";
import RoadsLayer from "@/components/map/RoadsLayer";
import MapLegend from "@/components/map/MapLegend";
import MapInfoPanel from "@/components/map/MapInfoPanel";
import MapSearch from "@/components/map/MapSearch";
import LayerToggle from "@/components/map/LayerToggle";
import FullscreenControl from "@/components/map/FullscreenControl";
import { categoryIcon } from "@/components/map/markerIcons";

function defaultActiveState() {
  return Object.fromEntries(MAP_LAYER_CONFIG.map((l) => [l.id, l.defaultOn]));
}

// RiskZone.geometry is a GeoJSON Polygon (ring of [lng,lat] pairs) — there's
// no lat/lng field on the model, so a simple vertex average stands in as a
// marker position (not a true polygon render).
function centroid(geometry) {
  const ring = geometry?.coordinates?.[0] ?? [];
  if (ring.length === 0) return null;
  const [lngSum, latSum] = ring.reduce(([lng, lat], [pLng, pLat]) => [lng + pLng, lat + pLat], [0, 0]);
  return { lat: latSum / ring.length, lng: lngSum / ring.length };
}

/**
 * Fully reusable Leaflet map — a GIS reference view, not a decorative
 * preview. Shelters/hospitals/schools/roads are static fixtures (see
 * src/data/mapData.js); the incidents layer reads the same
 * useRiskZones data the Authority dashboard's risk heatmap uses — real
 * app data, not invented for this view.
 *
 * Usage: <GuardiansMap className="h-[520px]" />
 */
function GuardiansMap({ className = "h-[480px]" }) {
  const wrapperRef = useRef(null);
  const mapRef = useRef(null);
  const [active, setActive] = useState(defaultActiveState);
  const [selected, setSelected] = useState(null);

  const { data: riskZones } = useRiskZones();

  // Attach a computed lat/lng to each zone once, rather than recomputing
  // the centroid on every render/marker.
  const incidentZones = useMemo(
    () =>
      (riskZones ?? [])
        .map((z) => {
          const c = centroid(z.geometry);
          return c ? { ...z, lat: c.lat, lng: c.lng } : null;
        })
        .filter(Boolean),
    [riskZones]
  );

  const icons = useMemo(
    () => ({
      shelter: { default: categoryIcon("shelter"), selected: categoryIcon("shelter", true) },
      hospital: { default: categoryIcon("hospital"), selected: categoryIcon("hospital", true) },
      school: { default: categoryIcon("school"), selected: categoryIcon("school", true) },
      incident: { default: categoryIcon("incident"), selected: categoryIcon("incident", true) },
    }),
    []
  );

  function toggleLayer(id) {
    setActive((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function selectFeature(category, data) {
    setSelected({ category, id: data.id, data });
  }

  function focusOn(item) {
    selectFeature(item.category, item.raw);
    mapRef.current?.flyTo([item.lat, item.lng], 15, { duration: 0.6 });
  }

  const isSelected = (category, id) => selected?.category === category && selected?.id === id;

  // Flat searchable index over whatever is currently loaded — used by
  // MapSearch, not a separate data source.
  const searchIndex = useMemo(() => {
    const items = [
      ...SHELTERS.map((s) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng, category: "shelter", raw: s })),
      ...HOSPITALS.map((h) => ({ id: h.id, name: h.name, lat: h.lat, lng: h.lng, category: "hospital", raw: h })),
      ...SCHOOLS.map((s) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng, category: "school", raw: s })),
      ...incidentZones.map((z) => ({ id: z.id, name: z.name || z.settlement, lat: z.lat, lng: z.lng, category: "incident", raw: z })),
    ];
    return items;
  }, [incidentZones]);

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full overflow-hidden rounded-sm border border-border bg-card ${className}`}
    >
      <MapContainer
        ref={mapRef}
        center={MAP_DEFAULTS.center}
        zoom={MAP_DEFAULTS.zoom}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ZoomControl position="bottomleft" />

        <HeatmapLayer points={HEATMAP_POINTS} visible={active.heatmap} />
        <RoadsLayer visible={active.roads} />

        {active.incidents &&
          incidentZones?.map((z) => (
            <Marker
              key={z.id}
              position={[z.lat, z.lng]}
              icon={isSelected("incident", z.id) ? icons.incident.selected : icons.incident.default}
              eventHandlers={{ click: () => selectFeature("incident", z) }}
            />
          ))}

        {active.shelters &&
          SHELTERS.map((s) => (
            <Marker
              key={s.id}
              position={[s.lat, s.lng]}
              icon={isSelected("shelter", s.id) ? icons.shelter.selected : icons.shelter.default}
              eventHandlers={{ click: () => selectFeature("shelter", s) }}
            />
          ))}

        {active.hospitals &&
          HOSPITALS.map((h) => (
            <Marker
              key={h.id}
              position={[h.lat, h.lng]}
              icon={isSelected("hospital", h.id) ? icons.hospital.selected : icons.hospital.default}
              eventHandlers={{ click: () => selectFeature("hospital", h) }}
            />
          ))}

        {active.schools &&
          SCHOOLS.map((s) => (
            <Marker
              key={s.id}
              position={[s.lat, s.lng]}
              icon={isSelected("school", s.id) ? icons.school.selected : icons.school.default}
              eventHandlers={{ click: () => selectFeature("school", s) }}
            />
          ))}
      </MapContainer>

      <div className="pointer-events-none absolute inset-2 z-[400] flex items-start justify-between">
        <MapSearch items={searchIndex} onSelect={focusOn} />
        <div className="pointer-events-auto flex flex-col items-end gap-1.5">
          <LayerToggle config={MAP_LAYER_CONFIG} active={active} onToggle={toggleLayer} />
          <FullscreenControl targetRef={wrapperRef} />
        </div>
      </div>

      {selected ? (
        <MapInfoPanel feature={selected} onClose={() => setSelected(null)} />
      ) : (
        <MapLegend />
      )}
    </div>
  );
}

export default GuardiansMap;
