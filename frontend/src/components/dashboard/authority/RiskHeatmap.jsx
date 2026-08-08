import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";

import { cn } from "@/lib/utils";
import { MAP_DEFAULTS } from "@/constants";
import { useRiskZones } from "@/hooks/queries/useAuthorityQueries";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { DataText } from "@/components/ui/typography";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorState from "@/components/common/ErrorState";

function riskColor(risk) {
  if (risk >= 70) return "hsl(var(--destructive))";
  if (risk >= 45) return "hsl(var(--warning))";
  return "hsl(var(--success))";
}

// RiskZone.geometry is a GeoJSON Polygon (ring of [lng,lat] pairs), not a
// single point — there's no lat/lng field on the model. Averaging the
// ring's vertices gives a reasonable marker position for a simple
// CircleMarker; it's not a true polygon render, just a stand-in centroid.
function centroid(geometry) {
  const ring = geometry?.coordinates?.[0] ?? [];
  if (ring.length === 0) return null;
  const [lngSum, latSum] = ring.reduce(([lng, lat], [pLng, pLat]) => [lng + pLng, lat + pLat], [0, 0]);
  return [latSum / ring.length, lngSum / ring.length];
}

/**
 * PLACEHOLDER: renders live zone-risk data on a real Leaflet map, but
 * circles (not a proper heat layer) still stand in for a real heatmap
 * render — see GuardiansMap's HeatmapLayer for the full heat-layer
 * implementation used elsewhere. Data now comes from the API
 * (useRiskZones) instead of static fixtures.
 */
function RiskHeatmap({ className }) {
  const { data: zones, isLoading, isError, error, refetch, isRefetching } = useRiskZones();

  return (
    <Card variant="highlight" className={cn("overflow-hidden", className)}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Risk heatmap</CardTitle>
          <CardDescription>Zone risk score, last 7 days — preview data</CardDescription>
        </div>
        <StatusChip variant="warning" dot={false}>
          Placeholder
        </StatusChip>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && <Skeleton className="h-[340px] w-full rounded-none" />}

        {isError && (
          <div className="p-4">
            <ErrorState context="the risk heatmap" detail={error?.message} onRetry={refetch} retrying={isRefetching} />
          </div>
        )}

        {zones && (
          <>
            <div className="h-[340px] w-full">
              <MapContainer
                center={MAP_DEFAULTS.center}
                zoom={MAP_DEFAULTS.zoom}
                scrollWheelZoom={false}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {zones.map((zone) => {
                  const center = centroid(zone.geometry);
                  if (!center) return null;
                  return (
                    <CircleMarker
                      key={zone.id}
                      center={center}
                      radius={12}
                      pathOptions={{
                        color: riskColor(zone.riskScore),
                        fillColor: riskColor(zone.riskScore),
                        fillOpacity: 0.35,
                        weight: 1.5,
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -6]}>
                        <span className="font-mono text-2xs">
                          {zone.name || zone.settlement} — risk {zone.riskScore}
                        </span>
                      </Tooltip>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border px-4 py-3">
              <LegendDot color="hsl(var(--destructive))" label="High risk (70+)" />
              <LegendDot color="hsl(var(--warning))" label="Medium risk (45–69)" />
              <LegendDot color="hsl(var(--success))" label="Low risk (<45)" />
              <DataText className="ml-auto text-muted-foreground">
                {zones.length} zones monitored
              </DataText>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </div>
  );
}

export default RiskHeatmap;
