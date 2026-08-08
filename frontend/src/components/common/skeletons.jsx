import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Matches the StatStrip used on every dashboard overview row. */
export function StatGridSkeleton({ count = 4 }) {
  return (
    <div className="grid divide-y divide-border border border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="w-full">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="mt-2.5 h-6 w-16" />
          </div>
          <Skeleton className="size-4 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** A titled card whose body is a chart-sized block — for TrendArea/Bar/Donut cards. */
export function ChartCardSkeleton({ height = 220, className }) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-2.5 w-56" />
      </CardHeader>
      <CardContent className="pt-4">
        <Skeleton className="w-full" style={{ height }} />
      </CardContent>
    </Card>
  );
}

/** A titled card with a row-list body — for alerts/history/activity/timeline cards. */
export function ListCardSkeleton({ rows = 4, className }) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-2.5 w-56" />
      </CardHeader>
      <CardContent className="space-y-0 p-0">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border p-3.5 last:border-0">
            <Skeleton className="size-7 shrink-0 rounded-md" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** A titled card with a table body — for feed/summary tables. */
export function TableCardSkeleton({ rows = 4, columns = 5, className }) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-2.5 w-56" />
      </CardHeader>
      <CardContent className="p-0">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton.TableRow key={i} columns={columns} />
        ))}
      </CardContent>
    </Card>
  );
}
