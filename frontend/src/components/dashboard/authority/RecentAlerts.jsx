import { AlertTriangle } from "lucide-react";

import { useAuthorityAlerts } from "@/hooks/queries/useAuthorityQueries";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { DataText, Muted } from "@/components/ui/typography";
import { ListCardSkeleton } from "@/components/common/skeletons";
import ErrorState from "@/components/common/ErrorState";
import { SEVERITY_VARIANT } from "@/constants/variants";


function RecentAlerts() {
  const { data: alerts, isLoading, isError, error, refetch, isRefetching } = useAuthorityAlerts();

  if (isLoading) return <ListCardSkeleton rows={4} />;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Recent alerts</CardTitle>
          <CardDescription>Latest zone-level advisories</CardDescription>
        </div>
        <AlertTriangle className="size-4 text-muted-foreground" />
      </CardHeader>

      {isError ? (
        <CardContent>
          <ErrorState context="recent alerts" detail={error?.message} onRetry={refetch} retrying={isRefetching} />
        </CardContent>
      ) : (
        <CardContent className="divide-y divide-border p-0">
          {alerts.map((a) => (
            <div key={a.id} className="flex items-start gap-3 p-3.5">
              <StatusChip variant={SEVERITY_VARIANT[a.severity]} className="mt-0.5 shrink-0">
                {a.severity}
              </StatusChip>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">{a.title}</div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{a.zone}</span>
                  <span>·</span>
                  <DataText className="text-2xs text-muted-foreground">{a.time}</DataText>
                </div>
              </div>
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="p-6 text-center">
              <Muted>No active alerts.</Muted>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default RecentAlerts;
