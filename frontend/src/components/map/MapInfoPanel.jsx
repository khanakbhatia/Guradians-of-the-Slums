import { X } from "lucide-react";

import { Eyebrow } from "@/components/ui/typography";

const CATEGORY_LABEL = {
  shelter: "Shelter",
  hospital: "Hospital",
  school: "School",
  incident: "Incident zone",
};

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

/**
 * Replaces the legend in the bottom-right corner while a marker is
 * selected. Only renders the fields actually present on the record —
 * no placeholder/invented values.
 */
function MapInfoPanel({ feature, onClose }) {
  const { category, data } = feature;

  return (
    <div className="pointer-events-auto absolute bottom-2 right-2 z-[400] w-56 rounded-sm border border-border-strong bg-popover/95 shadow-panel backdrop-blur">
      <div className="flex items-start justify-between gap-2 border-b border-border px-2.5 py-2">
        <div className="min-w-0">
          <Eyebrow>{CATEGORY_LABEL[category] ?? category}</Eyebrow>
          <div className="truncate text-sm font-medium text-foreground">{data.name}</div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close details"
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="space-y-0.5 px-2.5 py-2 text-xs">
        {data.type && <Row label="Type" value={data.type} />}
        {data.level && <Row label="Level" value={data.level} />}
        {data.capacity && <Row label="Capacity" value={data.capacity} />}
        {data.status && <Row label="Status" value={data.status} />}
        {typeof data.risk === "number" && <Row label="Risk score" value={data.risk} />}
        {typeof data.incidents === "number" && <Row label="Incidents" value={data.incidents} />}
        {typeof data.distanceKm === "number" && <Row label="Distance" value={`${data.distanceKm} km`} />}
      </div>
    </div>
  );
}

export default MapInfoPanel;
