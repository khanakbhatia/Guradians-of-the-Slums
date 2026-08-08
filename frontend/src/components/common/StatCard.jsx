import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Eyebrow, Metric } from "@/components/ui/typography";

/**
 * One cell in a stat strip — no border/shadow of its own. Render a row
 * of these inside a single bordered, divided container (see
 * StatStrip below) instead of one card per number. Matches how
 * Bloomberg/trading-terminal summary rows are built: one instrument
 * panel, internally divided, not four floating cards.
 */
function StatCard({ label, value, icon: Icon, trend, trendLabel, className }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-4 py-3", className)}>
      <div className="min-w-0">
        <Eyebrow>{label}</Eyebrow>
        <Metric className="mt-1 block">{value}</Metric>
        {typeof trend === "number" && trend !== 0 && (
          <div
            className={cn(
              "mt-1 inline-flex items-center gap-1 font-mono text-2xs",
              trend > 0 ? "text-success" : "text-destructive"
            )}
          >
            {trend > 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
            {Math.abs(trend)}% {trendLabel}
          </div>
        )}
      </div>
      {Icon && <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
    </div>
  );
}

/** Wraps a set of StatCards in one bordered, internally-divided strip. */
export function StatStrip({ children, className }) {
  return (
    <div
      className={cn(
        "grid divide-y divide-border border border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}

export default StatCard;
