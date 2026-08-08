import { Check, Circle, History } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Muted } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

const STATUS_STYLE = {
  done: "border-success/40 bg-success/10 text-success",
  current: "border-primary/50 bg-primary/10 text-primary",
  pending: "border-border-strong bg-muted text-muted-foreground",
};

function IncidentTimeline({ timeline }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>Lifecycle of this incident, reported to resolved</CardDescription>
        </div>
        <History className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="pt-2">
        {timeline.length === 0 && <Muted>No timeline events yet.</Muted>}
        <ol className="relative space-y-6 pl-7">
          <div className="absolute bottom-1 left-[13px] top-1 w-px bg-border" />
          {timeline.map((step) => (
            <li key={step.id} className="relative">
              <span
                className={cn(
                  "absolute -left-7 flex size-7 items-center justify-center rounded-full border bg-card",
                  STATUS_STYLE[step.status]
                )}
              >
                {step.status === "done" ? (
                  <Check className="size-3.5" />
                ) : (
                  <Circle className={cn("size-2.5", step.status === "current" && "fill-current")} />
                )}
              </span>
              <div
                className={cn(
                  "text-sm",
                  step.status === "pending" ? "text-muted-foreground" : "font-medium text-foreground"
                )}
              >
                {step.label}
              </div>
              <div className="mt-0.5 font-mono text-2xs text-muted-foreground">{step.time}</div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

export default IncidentTimeline;
