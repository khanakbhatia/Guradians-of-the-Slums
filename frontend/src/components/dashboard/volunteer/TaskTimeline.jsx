import { CheckCircle2, ClipboardCheck, History as HistoryIcon, MapPin, PlusCircle } from "lucide-react";

import { useVolunteerTimeline } from "@/hooks/queries/useVolunteerQueries";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorState from "@/components/common/ErrorState";

const TYPE_ICON = { assigned: PlusCircle, accepted: ClipboardCheck, completed: CheckCircle2, checkin: MapPin };
const TYPE_COLOR = {
  assigned: "bg-primary/10 text-primary border-primary/30",
  accepted: "bg-info/10 text-info border-info/30",
  completed: "bg-success/10 text-success border-success/30",
  checkin: "bg-muted text-muted-foreground border-border-strong",
};

function TaskTimeline() {
  const { data: events, isLoading, isError, error, refetch, isRefetching } = useVolunteerTimeline();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Task timeline</CardTitle>
          <CardDescription>Your recent activity</CardDescription>
        </div>
        <HistoryIcon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}

        {isError && <ErrorState context="your task timeline" detail={error?.message} onRetry={refetch} retrying={isRefetching} />}

        {events && (
          <ol className="relative space-y-5 pl-6">
            <div className="absolute bottom-1 left-[11px] top-1 w-px bg-border" />
            {events.map((event) => {
              const Icon = TYPE_ICON[event.type];
              return (
                <li key={event.id} className="relative">
                  <span
                    className={cn(
                      "absolute -left-6 flex size-6 items-center justify-center rounded-full border bg-card",
                      TYPE_COLOR[event.type]
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <div className="text-sm text-foreground/90">{event.title}</div>
                  <div className="mt-0.5 font-mono text-2xs text-muted-foreground">{event.time}</div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export default TaskTimeline;
