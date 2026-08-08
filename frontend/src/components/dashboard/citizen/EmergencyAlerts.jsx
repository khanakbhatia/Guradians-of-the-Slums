import { BellRing } from "lucide-react";

import { useCitizenAlerts } from "@/hooks/queries/useCitizenQueries";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DataText, Muted } from "@/components/ui/typography";
import { ListCardSkeleton } from "@/components/common/skeletons";
import ErrorState from "@/components/common/ErrorState";
import { cn } from "@/lib/utils";

const SEVERITY_DOT = {
  destructive: "bg-destructive",
  warning: "bg-warning",
  info: "bg-info",
  success: "bg-success",
};

/**
 * Compact alert list — a status row per advisory, not a stack of full
 * alert boxes. a.severity already matches destructive/warning/info
 * directly from the API.
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
              <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", SEVERITY_DOT[a.severity] ?? "bg-muted-foreground")} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">{a.title}</div>
                <Muted className="mt-0.5">{a.body}</Muted>
                <DataText className="mt-1 block text-2xs text-muted-foreground">{a.time}</DataText>
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
