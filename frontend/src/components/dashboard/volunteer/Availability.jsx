import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";

import { WEEK_DAYS } from "@/data/volunteerDashboard";
import { useVolunteerAvailability, useUpdateAvailability } from "@/hooks/queries/useVolunteerQueries";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import ErrorState from "@/components/common/ErrorState";

/**
 * Fetches current availability from the API, then updates optimistically
 * on every toggle (instant UI feedback) while persisting via
 * useUpdateAvailability in the background.
 */
function Availability() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useVolunteerAvailability();
  const updateAvailability = useUpdateAvailability();

  const [availability, setAvailability] = useState(null);

  useEffect(() => {
    if (data) setAvailability(data);
  }, [data]);

  function persist(next) {
    setAvailability(next);
    updateAvailability.mutate(next, {
      onError: (err) => {
        toast({ variant: "destructive", title: "Couldn't save availability", description: err?.message });
      },
    });
  }

  function toggleActive() {
    const next = { ...availability, activeNow: !availability.activeNow };
    toast({
      title: next.activeNow ? "You're marked available" : "You're marked unavailable",
      description: next.activeNow ? "You may receive new task assignments." : "You won't receive new assignments.",
    });
    persist(next);
  }

  function toggleDay(day) {
    persist({ ...availability, days: { ...availability.days, [day]: !availability.days[day] } });
  }

  if (isLoading || !availability) {
    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Availability</CardTitle>
            <CardDescription>Control when you can be assigned tasks</CardDescription>
          </div>
          <CalendarClock className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-5">
          {isError ? (
            <ErrorState context="your availability" detail={error?.message} onRetry={refetch} retrying={isRefetching} />
          ) : (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Availability</CardTitle>
          <CardDescription>Control when you can be assigned tasks</CardDescription>
        </div>
        <CalendarClock className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 p-3.5">
          <div>
            <div className="text-sm font-medium text-foreground">Available now</div>
            <div className="text-xs text-muted-foreground">
              {availability.activeNow ? "You can receive new assignments" : "You're paused for new assignments"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusChip variant={availability.activeNow ? "success" : "neutral"} pulse={availability.activeNow}>
              {availability.activeNow ? "Active" : "Paused"}
            </StatusChip>
            <button
              role="switch"
              aria-checked={availability.activeNow}
              onClick={toggleActive}
              className={cn(
                "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                availability.activeNow ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-4 rounded-full bg-background shadow transition-transform",
                  availability.activeNow ? "translate-x-4" : "translate-x-0.5"
                )}
              />
            </button>
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-medium text-muted-foreground">Weekly schedule</div>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEK_DAYS.map((day) => (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md border py-2 text-2xs font-medium transition-colors",
                  availability.days[day]
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border-strong text-muted-foreground hover:bg-accent"
                )}
              >
                {day}
                <span className={cn("size-1.5 rounded-full", availability.days[day] ? "bg-primary" : "bg-muted-foreground/40")} />
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default Availability;
