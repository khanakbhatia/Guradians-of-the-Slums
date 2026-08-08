import * as ProgressPrimitive from "@radix-ui/react-progress";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/ui/typography";

/** Inline spinner — buttons, small async regions. */
function Spinner({ className, size = 16 }) {
  return (
    <Loader2
      className={cn("animate-spin text-muted-foreground", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** Full-panel loading state — replaces a card/section body while fetching. */
function LoadingPanel({ label = "Loading data\u2026", className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-center",
        className
      )}
    >
      <Spinner size={22} className="text-primary" />
      <Eyebrow className="text-muted-foreground">{label}</Eyebrow>
    </div>
  );
}

/** Blocking overlay for an already-rendered panel (e.g. re-fetching). */
function LoadingOverlay({ className }) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-[1px]",
        className
      )}
    >
      <Spinner size={20} className="text-primary" />
    </div>
  );
}

const ProgressBar = ({ value = 0, className, indicatorClassName }) => (
  <ProgressPrimitive.Root
    className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
  >
    <ProgressPrimitive.Indicator
      className={cn("h-full flex-1 rounded-full bg-primary transition-transform duration-300 ease-out", indicatorClassName)}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
);

export { Spinner, LoadingPanel, LoadingOverlay, ProgressBar };
