import { Crown, ShieldCheck, Siren, Users } from "lucide-react";

import {
  useAdminOverview,
  useUserBreakdown,
  useSignupTrend,
  useAdminActivity,
  useSystemStatus,
} from "@/hooks/queries/useAdminQueries";

import DashboardHeader from "@/components/common/DashboardHeader";
import StatCard, { StatStrip } from "@/components/common/StatCard";
import { StatGridSkeleton, ChartCardSkeleton, ListCardSkeleton } from "@/components/common/skeletons";
import ErrorState from "@/components/common/ErrorState";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { TrendAreaChart, DonutChart } from "@/components/ui/charts";
import { StatusChip } from "@/components/ui/status-chip";
import { DataText, Muted } from "@/components/ui/typography";

const ICONS = { Users, ShieldCheck, Siren, Crown };
const STATUS_VARIANT = { operational: "success", degraded: "warning", down: "destructive" };

/**
 * Admin Dashboard — every section reads from the API (see
 * hooks/queries/useAdminQueries.js). No backend integrated in this
 * sandbox, so expect loading → error/retry until a real API answers.
 */
function AdminDashboard() {
  const overview = useAdminOverview();
  const breakdown = useUserBreakdown();
  const trend = useSignupTrend();
  const activity = useAdminActivity();
  const status = useSystemStatus();

  return (
    <div className="space-y-6">
      <DashboardHeader subtitle="Platform-wide users, activity, and service health." />

      {overview.isLoading && <StatGridSkeleton count={4} />}
      {overview.isError && (
        <ErrorState context="overview stats" detail={overview.error?.message} onRetry={overview.refetch} retrying={overview.isRefetching} />
      )}
      {overview.data && (
        <StatStrip>
          {overview.data.map((s) => (
            <StatCard
              key={s.id}
              label={s.label}
              value={s.value}
              icon={ICONS[s.icon]}
              trend={s.trend}
              trendLabel={s.trendLabel}
            />
          ))}
        </StatStrip>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {trend.isLoading && <ChartCardSkeleton height={220} className="lg:col-span-2" />}
        {trend.isError && (
          <div className="lg:col-span-2">
            <ErrorState context="the signup trend" detail={trend.error?.message} onRetry={trend.refetch} retrying={trend.isRefetching} />
          </div>
        )}
        {trend.data && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Signups — last 7 days</CardTitle>
              <CardDescription>New accounts across all roles</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <TrendAreaChart data={trend.data} areaKey="signups" height={220} />
            </CardContent>
          </Card>
        )}

        {breakdown.isLoading && <ChartCardSkeleton height={160} />}
        {breakdown.isError && (
          <ErrorState context="user composition" detail={breakdown.error?.message} onRetry={breakdown.refetch} retrying={breakdown.isRefetching} />
        )}
        {breakdown.data && (
          <Card>
            <CardHeader>
              <CardTitle>User composition</CardTitle>
              <CardDescription>By role, platform-wide</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <DonutChart data={breakdown.data} height={160} />
              <div className="mt-3 space-y-1.5">
                {breakdown.data.map((r) => (
                  <div key={r.name} className="flex items-center gap-1.5 text-xs">
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: r.color }} />
                    <span className="text-muted-foreground">{r.name}</span>
                    <DataText className="ml-auto">{r.value.toLocaleString()}</DataText>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {activity.isLoading && <ListCardSkeleton rows={5} />}
        {activity.isError && (
          <ErrorState context="recent activity" detail={activity.error?.message} onRetry={activity.refetch} retrying={activity.isRefetching} />
        )}
        {activity.data && (
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Administrative actions across the platform</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0">
              {activity.data.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-4 p-3.5">
                  <div className="min-w-0">
                    <div className="text-sm text-foreground/90">{a.action}</div>
                    <Muted className="mt-0.5">{a.actor}</Muted>
                  </div>
                  <DataText className="shrink-0 text-2xs text-muted-foreground">{a.time}</DataText>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {status.isLoading && <ListCardSkeleton rows={4} />}
        {status.isError && (
          <ErrorState context="service status" detail={status.error?.message} onRetry={status.refetch} retrying={status.isRefetching} />
        )}
        {status.data && (
          <Card>
            <CardHeader>
              <CardTitle>Service status</CardTitle>
              <CardDescription>Platform components, polled every 30s</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0">
              {status.data.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3.5">
                  <span className="text-sm text-foreground/90">{s.label}</span>
                  <StatusChip variant={STATUS_VARIANT[s.status]}>{s.status}</StatusChip>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
