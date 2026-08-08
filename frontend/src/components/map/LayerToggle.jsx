import { Layers } from "lucide-react";

import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/ui/typography";

/** Checkbox panel for showing/hiding each map layer. Positioned by its parent. */
function LayerToggle({ config, active, onToggle }) {
  return (
    <div className="w-36 rounded-sm border border-border-strong bg-popover/95 p-2 shadow-panel backdrop-blur sm:w-40">
      <div className="mb-1 flex items-center gap-1.5 px-0.5">
        <Layers className="size-3 text-muted-foreground" />
        <Eyebrow>Layers</Eyebrow>
      </div>
      <div className="space-y-0">
        {config.map((layer) => (
          <button
            key={layer.id}
            onClick={() => onToggle(layer.id)}
            className="flex w-full items-center gap-1.5 rounded-sm px-1 py-1 text-left text-xs text-foreground/90 transition-colors hover:bg-accent"
          >
            <span
              className={cn(
                "flex size-3 shrink-0 items-center justify-center rounded-sm border transition-colors",
                active[layer.id]
                  ? "border-primary bg-primary"
                  : "border-border-strong bg-transparent"
              )}
            >
              {active[layer.id] && (
                <svg viewBox="0 0 12 12" className="size-2 fill-none stroke-primary-foreground stroke-2">
                  <path d="M2.5 6.5 5 9l4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            {layer.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default LayerToggle;
