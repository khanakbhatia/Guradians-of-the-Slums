import { Award, Flame, Trophy, Clock } from "lucide-react";

import { useVolunteerScore } from "@/hooks/queries/useVolunteerQueries";
import { Card, CardContent } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { DataText, Eyebrow, Muted } from "@/components/ui/typography";
import { ProgressBar } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorState from "@/components/common/ErrorState";

function VolunteerScoreCard() {
  const { data: s, isLoading, isError, error, refetch, isRefetching } = useVolunteerScore();

  if (isLoading) {
    return (
      <Card variant="highlight">
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
          <Skeleton className="size-20 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-1.5 w-full" />
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
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
          <DataText className="text-2xl font-semibold text-primary">{s.score}</DataText>
          <Eyebrow className="text-primary/80">points</Eyebrow>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Trophy className="size-4 text-warning" />
            <span className="text-sm font-semibold text-foreground">{s.level}</span>
            <StatusChip variant="primary" dot={false}>Rank #{s.rank}</StatusChip>
          </div>

          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress to next level</span>
              <DataText>{s.levelProgress}%</DataText>
            </div>
            <ProgressBar value={s.levelProgress} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <MiniStat icon={Award} label="Tasks done" value={s.tasksCompleted} />
            <MiniStat icon={Clock} label="Hours logged" value={s.hoursLogged} />
            <MiniStat icon={Flame} label="Day streak" value={s.streakDays} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0">
        <DataText className="block text-sm text-foreground">{value}</DataText>
        <Muted className="truncate text-2xs">{label}</Muted>
      </div>
    </div>
  );
}

export default VolunteerScoreCard;
