import { useAuthorityAnalytics } from "@/hooks/queries/useAuthorityQueries";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { TrendAreaChart, ComparisonBarChart, DonutChart } from "@/components/ui/charts";
import { DataText } from "@/components/ui/typography";
import { ChartCardSkeleton } from "@/components/common/skeletons";
import ErrorState from "@/components/common/ErrorState";

function AnalyticsCards() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useAuthorityAnalytics();

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCardSkeleton height={220} className="lg:col-span-2" />
        <ChartCardSkeleton height={160} />
        <ChartCardSkeleton height={220} className="lg:col-span-3" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState context="analytics" detail={error?.message} onRetry={refetch} retrying={isRefetching} />;
  }

  const { trend, zoneLoad, severityMix } = data;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Incident volume — last 7 days</CardTitle>
          <CardDescription>Reports received across all monitored zones</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <TrendAreaChart data={trend} areaKey="incidents" height={220} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Severity mix</CardTitle>
          <CardDescription>Open incidents by severity</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <DonutChart data={severityMix} height={160} />
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {severityMix.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs">
                <span className="size-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-muted-foreground">{s.name}</span>
                <DataText className="ml-auto">{s.value}</DataText>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Zone load</CardTitle>
          <CardDescription>Open vs resolved incidents by zone</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <ComparisonBarChart
            data={zoneLoad}
            bars={[
              { key: "open", label: "Open", color: "hsl(var(--chart-2))" },
              { key: "resolved", label: "Resolved", color: "hsl(var(--chart-1))" },
            ]}
            height={220}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default AnalyticsCards;
