import { Bell } from "lucide-react";

import { useCitizenNotifications, useMarkNotificationRead, useCitizenReports } from "@/hooks/queries/useCitizenQueries";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Eyebrow, Muted } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { ListCardSkeleton } from "@/components/common/skeletons";
import ErrorState from "@/components/common/ErrorState";
import { StatusChip } from "@/components/ui/status-chip";

function formatTime(val) {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleString();
}

/**
 * My reports & recent updates — one feed, since report-status changes
 * and zone updates are the same underlying activity stream for a
 * citizen. Compact rows, not cards.
 */
function RecentNotifications() {
  const { data: notifications, isLoading, isError, error, refetch, isRefetching } = useCitizenNotifications();
  const { data: reports, isLoading: reportsLoading, isError: reportsError, error: reportsErr, refetch: refetchReports, isRefetching: isRefetchingReports } = useCitizenReports();
  const markRead = useMarkNotificationRead();

  if (isLoading || reportsLoading) return <ListCardSkeleton rows={4} />;

  const combinedError = isError || reportsError;
  const errorObj = error || reportsErr;
  const anyRefetching = isRefetching || isRefetchingReports;

  const handleRetry = () => {
    refetch();
    refetchReports();
  };

  const notificationsData = notifications || [];
  const reportsData = reports || [];

  const combined = [
    ...notificationsData.map((n) => ({
      id: n.id || n._id,
      title: n.title,
      message: n.message,
      createdAt: n.createdAt,
      isRead: n.isRead,
      type: "notification",
      priority: n.priority,
    })),
    ...reportsData.map((r) => ({
      id: r.id || r._id,
      title: `Reported: ${r.hazardType.toUpperCase().replace("_", " ")}`,
      message: r.description,
      createdAt: r.createdAt,
      isRead: true,
      type: "report",
      status: r.status,
      severity: r.severity,
    })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>My reports & updates</CardTitle>
          <CardDescription>Status changes on your reports and your zone</CardDescription>
        </div>
        <Bell className="size-4 text-muted-foreground" />
      </CardHeader>

      {combinedError ? (
        <CardContent>
          <ErrorState context="your reports & updates" detail={errorObj?.message} onRetry={handleRetry} retrying={anyRefetching} compact />
        </CardContent>
      ) : combined.length === 0 ? (
        <CardContent>
          <Muted>Nothing to report yet.</Muted>
        </CardContent>
      ) : (
        <CardContent className="divide-y divide-border p-0">
          {combined.map((item) => {
            if (item.type === "notification") {
              return (
                <button
                  key={item.id}
                  onClick={() => markRead.mutate(item.id)}
                  className={cn(
                    "flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-accent",
                    !item.isRead && "bg-primary/5"
                  )}
                >
                  <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", item.isRead ? "bg-transparent" : "bg-primary")} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-foreground">{item.title}</div>
                    <Muted className="mt-0.5">{item.message}</Muted>
                    <Eyebrow className="mt-1 block">{formatTime(item.createdAt)}</Eyebrow>
                  </div>
                </button>
              );
            } else {
              return (
                <div
                  key={item.id}
                  className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-accent"
                >
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-transparent" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-medium text-foreground">{item.title}</div>
                      <StatusChip
                        variant={
                          item.status === "verified" ? "success" :
                          item.status === "pending" ? "warning" :
                          item.status === "flagged" ? "destructive" :
                          item.status === "rejected" ? "destructive" :
                          "neutral"
                        }
                      >
                        {item.status}
                      </StatusChip>
                    </div>
                    <Muted className="mt-0.5">{item.message}</Muted>
                    <Eyebrow className="mt-1 block">{formatTime(item.createdAt)}</Eyebrow>
                  </div>
                </div>
              );
            }
          })}
        </CardContent>
      )}
    </Card>
  );
}

export default RecentNotifications;

