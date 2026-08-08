import GuardiansMap from "@/components/map/GuardiansMap";
import { Eyebrow } from "@/components/ui/typography";

/**
 * Live Map — the map is the primary content here, so the header is a
 * single compact line, not a hero block.
 */
function MapView() {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h1 className="text-base font-semibold text-foreground">Nearby Map</h1>
        <Eyebrow>Shelters · Hospitals · Schools · Incidents</Eyebrow>
      </div>

      <GuardiansMap className="h-[70vh] min-h-[420px] sm:h-[75vh] lg:h-[calc(100vh-8.5rem)]" />
    </div>
  );
}

export default MapView;
