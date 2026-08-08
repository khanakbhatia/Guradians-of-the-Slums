import { Eyebrow } from "@/components/ui/typography";

const ITEMS = [
  { color: "hsl(var(--destructive))", label: "Incident" },
  { color: "hsl(var(--primary))", label: "Shelter" },
  { color: "hsl(var(--info))", label: "Hospital" },
  { color: "hsl(var(--warning))", label: "School" },
  { color: "hsl(var(--muted-foreground))", label: "Road", line: true },
];

/** Compact reference key, overlaid bottom-right (clear of the zoom control at bottom-left). */
function MapLegend() {
  return (
    <div className="pointer-events-none absolute bottom-2 right-2 z-[400] max-w-[calc(100%-1rem)] rounded-sm border border-border-strong bg-popover/95 px-2.5 py-2 shadow-panel backdrop-blur">
      <Eyebrow className="mb-1 block">Legend</Eyebrow>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs text-foreground/90">
            {item.line ? (
              <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
            ) : (
              <span
                className="size-2 shrink-0 rounded-full border border-background"
                style={{ backgroundColor: item.color }}
              />
            )}
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MapLegend;
