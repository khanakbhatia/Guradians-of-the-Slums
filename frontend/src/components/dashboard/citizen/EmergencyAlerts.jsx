import { BellRing } from "lucide-react";

import { useCitizenAlerts } from "@/hooks/queries/useCitizenQueries";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DataText, Muted } from "@/components/ui/typography";
import { ListCardSkeleton } from "@/components/common/skeletons";
import ErrorState from "@/components/common/ErrorState";
import { cn } from "@/lib/utils";

// Notification.priority is low/normal/high/urgent (see backend model) —
// mapped to a dot color rather than the invented destructive/warning/
// info/success severity this card used to expect.
const PRIORITY_DOT = {
  urgent: "bg-destructive",
  high: "bg-warning",
  normal: "bg-info",
  low: "bg-success",
};

/**
 * Compact alert list — a status row per advisory, not a stack of full
 * alert boxes. Backed by the shared /notifications endpoint (there's no
 * dedicated "alerts" resource) — every notification a citizen has
 * received shows up here.
 */
function EmergencyAlerts() {
  const { data: alerts, isLoading, isError, error, refetch, isRefetching } = useCitizenAlerts();

  if (isLoading) return <ListCardSkeleton rows={2} />;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Active alerts</CardTitle>
          <CardDescription>Advisories for your area</CardDescription>
        </div>
        <BellRing className="size-4 text-muted-foreground" />
      </CardHeader>

      {isError ? (
        <CardContent>
          <ErrorState context="active alerts" detail={error?.message} onRetry={refetch} retrying={isRefetching} compact />
        </CardContent>
      ) : (
        <CardContent className="divide-y divide-border p-0">
          {alerts.map((a) => (
            <div key={a.id} className="flex items-start gap-3 p-3">
              <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", PRIORITY_DOT[a.priority] ?? "bg-muted-foreground")} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">{a.title}</div>
                <Muted className="mt-0.5">{a.message}</Muted>
                <DataText className="mt-1 block text-2xs text-muted-foreground">{a.createdAt}</DataText>
              </div>
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="p-5 text-center">
              <Muted>No active advisories right now.</Muted>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default EmergencyAlerts;
