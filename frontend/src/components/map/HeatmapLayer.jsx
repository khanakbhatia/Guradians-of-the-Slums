import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

window.L = window.L || L;
// Side-effect import: attaches L.heatLayer to the Leaflet global above.
import "leaflet.heat";

/**
 * DUMMY heatmap — renders static HEATMAP_POINTS via leaflet.heat.
 * react-leaflet has no native heat-layer component, so this bridges the
 * imperative Leaflet plugin into the declarative tree via useMap().
 */
function HeatmapLayer({ points, visible = true, radius = 28, blur = 22 }) {
  const map = useMap();

  useEffect(() => {
    if (!visible || !points?.length) return undefined;

    const layer = L.heatLayer(points, {
      radius,
      blur,
      maxZoom: 17,
      gradient: {
        0.2: "hsl(208, 38%, 50%)",
        0.4: "hsl(185, 35%, 42%)",
        0.6: "hsl(36, 65%, 47%)",
        0.8: "hsl(20, 55%, 48%)",
        1.0: "hsl(355, 55%, 48%)",
      },
    });

    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, points, visible, radius, blur]);

  return null;
}

export default HeatmapLayer;
