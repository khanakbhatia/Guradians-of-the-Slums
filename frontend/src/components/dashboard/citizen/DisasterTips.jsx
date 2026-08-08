import { BatteryCharging, BookOpen, CloudRain, Flame, Wind } from "lucide-react";

import { useDisasterTips } from "@/hooks/queries/useCitizenQueries";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Muted } from "@/components/ui/typography";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorState from "@/components/common/ErrorState";

const ICONS = { CloudRain, Flame, Wind, BatteryCharging };

function DisasterTips() {
  const { data: tips, isLoading, isError, error, refetch, isRefetching } = useDisasterTips();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Disaster tips</CardTitle>
          <CardDescription>Quick guidance for common situations</CardDescription>
        </div>
        <BookOpen className="size-4 text-muted-foreground" />
      </CardHeader>

      {isError ? (
        <CardContent>
          <ErrorState context="disaster tips" detail={error?.message} onRetry={refetch} retrying={isRefetching} />
        </CardContent>
      ) : (
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}

          {!isLoading && tips?.length === 0 && (
            <Muted className="sm:col-span-2">No guidance available right now.</Muted>
          )}

          {tips?.map((t) => {
            const Icon = ICONS[t.icon];
            return (
              <div key={t.id} className="flex items-start gap-2.5 border border-border p-3">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{t.title}</div>
                  <Muted className="mt-1">{t.body}</Muted>
                </div>
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}

export default DisasterTips;
