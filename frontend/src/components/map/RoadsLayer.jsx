import { GeoJSON } from "react-leaflet";

import { ROADS_GEOJSON } from "@/data/mapData";

const ROAD_STYLE = {
  color: "hsl(var(--muted-foreground))",
  weight: 2.5,
  opacity: 0.7,
  dashArray: "1 6",
  lineCap: "round",
};

function onEachRoad(feature, layer) {
  if (feature.properties?.name) {
    layer.bindTooltip(feature.properties.name, { sticky: true, direction: "top" });
  }
}

/** Static GeoJSON road network — see src/data/mapData.js. */
function RoadsLayer({ visible }) {
  if (!visible) return null;
  return <GeoJSON data={ROADS_GEOJSON} style={ROAD_STYLE} onEachFeature={onEachRoad} />;
}

export default RoadsLayer;
