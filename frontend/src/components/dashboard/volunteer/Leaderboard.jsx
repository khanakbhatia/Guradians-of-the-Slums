import { Medal, Trophy } from "lucide-react";

import { useVolunteerLeaderboard } from "@/hooks/queries/useVolunteerQueries";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DataText, Muted } from "@/components/ui/typography";
import { cn, initials } from "@/lib/utils";
import { ListCardSkeleton } from "@/components/common/skeletons";
import ErrorState from "@/components/common/ErrorState";

const MEDAL_COLOR = ["text-warning", "text-muted-foreground", "text-[hsl(24,60%,50%)]"];

function Leaderboard() {
  const { data: board, isLoading, isError, error, refetch, isRefetching } = useVolunteerLeaderboard();

  if (isLoading) return <ListCardSkeleton rows={5} />;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>Top volunteers this month</CardDescription>
        </div>
        <Trophy className="size-4 text-muted-foreground" />
      </CardHeader>

      {isError ? (
        <CardContent>
          <ErrorState context="the leaderboard" detail={error?.message} onRetry={refetch} retrying={isRefetching} />
        </CardContent>
      ) : board.length === 0 ? (
        <CardContent>
          <Muted>No rankings yet.</Muted>
        </CardContent>
      ) : (
        <CardContent className="divide-y divide-border p-0">
          {board.map((u, i) => (
            <div
              key={u.id}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5",
                u.isCurrentUser && "bg-primary/5"
              )}
            >
              <div className="flex w-6 shrink-0 items-center justify-center">
                {i < 3 ? (
                  <Medal className={cn("size-4", MEDAL_COLOR[i])} />
                ) : (
                  <DataText className="text-muted-foreground">{i + 1}</DataText>
                )}
              </div>
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-2xs font-medium text-foreground">
                {initials(u.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className={cn("truncate text-sm", u.isCurrentUser ? "font-semibold text-primary" : "text-foreground/90")}>
                  {u.name} {u.isCurrentUser && "(You)"}
                </div>
                <div className="text-2xs text-muted-foreground">{u.tasksCompleted} tasks completed</div>
              </div>
              <DataText className="shrink-0 text-foreground">{u.score}</DataText>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

export default Leaderboard;
