import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";

import { useVolunteerAvailability, useUpdateAvailability } from "@/hooks/queries/useVolunteerQueries";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import ErrorState from "@/components/common/ErrorState";

const STATUSES = [
  { value: "available", label: "Available", variant: "success" },
  { value: "busy", label: "Busy", variant: "warning" },
  { value: "offline", label: "Offline", variant: "neutral" },
];

/**
 * The backend's availability field is a single enum string
 * (available/busy/offline) — there's no weekly per-day schedule on the
 * Volunteer model, so the old "activeNow + days" toggle grid had nothing
 * real to read or write. Replaced with a 3-way status picker that matches
 * what PATCH /volunteers/me/availability actually accepts.
 */
function Availability() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useVolunteerAvailability();
  const updateAvailability = useUpdateAvailability();

  const [availability, setAvailability] = useState(null);

  useEffect(() => {
    if (data) setAvailability(data.availability);
  }, [data]);

  function setStatus(value) {
    if (value === availability) return;
    const prev = availability;
    setAvailability(value);
    updateAvailability.mutate(
      { availability: value },
      {
        onError: (err) => {
          setAvailability(prev);
          toast({ variant: "destructive", title: "Couldn't save availability", description: err?.message });
        },
      }
    );
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
            <Skeleton className="h-16 w-full" />
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
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-md border py-3 text-xs font-medium transition-colors",
                availability === s.value
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border-strong text-muted-foreground hover:bg-accent"
              )}
            >
              <StatusChip variant={s.variant} pulse={availability === s.value && s.value === "available"}>
                {s.label}
              </StatusChip>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default Availability;
