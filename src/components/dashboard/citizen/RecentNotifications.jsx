import { Bell } from "lucide-react";

import { useCitizenNotifications, useMarkNotificationRead } from "@/hooks/queries/useCitizenQueries";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Eyebrow, Muted } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { ListCardSkeleton } from "@/components/common/skeletons";
import ErrorState from "@/components/common/ErrorState";

/**
 * My reports & recent updates — one feed, since report-status changes
 * and zone updates are the same underlying activity stream for a
 * citizen. Compact rows, not cards.
 */
function RecentNotifications() {
  const { data: notifications, isLoading, isError, error, refetch, isRefetching } = useCitizenNotifications();
  const markRead = useMarkNotificationRead();

  if (isLoading) return <ListCardSkeleton rows={4} />;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>My reports & updates</CardTitle>
          <CardDescription>Status changes on your reports and your zone</CardDescription>
        </div>
        <Bell className="size-4 text-muted-foreground" />
      </CardHeader>

      {isError ? (
        <CardContent>
          <ErrorState context="your reports & updates" detail={error?.message} onRetry={refetch} retrying={isRefetching} compact />
        </CardContent>
      ) : notifications.length === 0 ? (
        <CardContent>
          <Muted>Nothing to report yet.</Muted>
        </CardContent>
      ) : (
        <CardContent className="divide-y divide-border p-0">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => markRead.mutate(n.id)}
              className={cn(
                "flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-accent",
                !n.read && "bg-primary/5"
              )}
            >
              <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-foreground">{n.title}</div>
                <Muted className="mt-0.5">{n.body}</Muted>
                <Eyebrow className="mt-1 block">{n.time}</Eyebrow>
              </div>
            </button>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

export default RecentNotifications;
