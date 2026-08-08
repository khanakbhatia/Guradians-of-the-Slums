import { Award, ShieldCheck } from "lucide-react";

import { useVolunteerProfile } from "@/hooks/queries/useVolunteerQueries";
import { Card, CardContent } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { DataText, Eyebrow, Muted } from "@/components/ui/typography";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorState from "@/components/common/ErrorState";

/**
 * The backend Volunteer model only has trustScore + verified — no
 * level/rank/levelProgress/hoursLogged/streakDays (those were dummy
 * gamification fields with nothing behind them). Rendering what's
 * actually there instead of guessing at the rest.
 */
function VolunteerScoreCard() {
  const { data: v, isLoading, isError, error, refetch, isRefetching } = useVolunteerProfile();

  if (isLoading) {
    return (
      <Card variant="highlight">
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
          <Skeleton className="size-20 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-1.5 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card variant="highlight">
        <CardContent className="p-5">
          <ErrorState context="your score" detail={error?.message} onRetry={refetch} retrying={isRefetching} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="highlight">
      <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        <div className="flex size-20 shrink-0 flex-col items-center justify-center rounded-full border border-primary/30 bg-primary/10">
          <DataText className="text-2xl font-semibold text-primary">{v.trustScore}</DataText>
          <Eyebrow className="text-primary/80">trust score</Eyebrow>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Award className="size-4 text-warning" />
            <span className="text-sm font-semibold text-foreground">{v.skills?.join(", ") || "No skills listed"}</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            {v.verified && (
              <StatusChip variant="success" dot={false}>
                <ShieldCheck className="mr-1 size-3" /> Verified
              </StatusChip>
            )}
            <StatusChip variant="primary" dot={false}>{v.availability}</StatusChip>
          </div>
          <Muted className="mt-3 block">
            Task history and streaks aren't tracked by the API yet.
          </Muted>
        </div>
      </CardContent>
    </Card>
  );
}

export default VolunteerScoreCard;
