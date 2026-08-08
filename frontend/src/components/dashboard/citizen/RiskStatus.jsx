import { MapPin } from "lucide-react";

import { useRiskStatus } from "@/hooks/queries/useCitizenQueries";
import { Card, CardContent } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { Eyebrow, DataText, Muted } from "@/components/ui/typography";
import { Skeleton } from "@/components/ui/skeleton";
import RiskGauge from "@/components/dashboard/citizen/RiskGauge";
import ErrorState from "@/components/common/ErrorState";

const LEVEL_LABEL = { low: "Safe", moderate: "Warning", high: "Critical" };
const LEVEL_VARIANT = { low: "success", moderate: "warning", high: "destructive" };

/**
 * Compact area safety status — a status strip, not a hero card. Gauge
 * is small and sits inline with the zone name, level, and contributing
 * factors so the whole thing reads in one glance.
 */
function RiskStatus() {
  const { data: status, isLoading, isError, error, refetch, isRefetching } = useRiskStatus();

  if (isLoading) {
    return (
      <Card variant="highlight">
        <CardContent className="flex items-center gap-4 p-3.5">
          <Skeleton className="size-14 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-full max-w-md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card variant="highlight">
        <CardContent className="p-3.5">
          <ErrorState context="your area status" detail={error?.message} onRetry={refetch} retrying={isRefetching} compact />
        </CardContent>
      </Card>
    );
  }

  // No risk-status resource on the backend yet — show a neutral empty
  // state rather than assuming the fields below exist.
  if (!status) {
    return (
      <Card variant="highlight">
        <CardContent className="p-3.5">
          <Muted>Area risk status isn&apos;t available yet.</Muted>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="highlight">
      <CardContent className="flex flex-wrap items-center gap-4 p-3.5">
        <RiskGauge score={status.score} level={status.level} size={56} strokeWidth={5} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
              <MapPin className="size-3.5 text-muted-foreground" /> {status.zone}
            </span>
            <StatusChip variant={LEVEL_VARIANT[status.level]}>{LEVEL_LABEL[status.level]}</StatusChip>
            <Eyebrow>updated {status.updated}</Eyebrow>
          </div>

          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
            {status.factors.map((f) => (
              <span key={f} className="text-xs text-muted-foreground">
                <DataText className="text-2xs text-muted-foreground/70">·</DataText> {f}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default RiskStatus;
