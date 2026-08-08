import { Link } from "react-router-dom";
import { Home, Map as MapIcon } from "lucide-react";

import { ROUTES } from "@/constants";
import { useNearbyShelters } from "@/hooks/queries/useCitizenQueries";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { DataText, Muted } from "@/components/ui/typography";
import { ListCardSkeleton } from "@/components/common/skeletons";
import ErrorState from "@/components/common/ErrorState";

const STATUS_VARIANT = { open: "success", full: "destructive" };

/**
 * Compact shelter list — no embedded map preview (the full interactive
 * map already lives at /dashboard/map with shelters, hospitals, and
 * roads); this panel is the fast-scan list, with a link out to the map.
 */
function NearbyShelters() {
  const { data: shelters, isLoading, isError, error, refetch, isRefetching } = useNearbyShelters();

  if (isLoading) return <ListCardSkeleton rows={3} />;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Nearby shelters</CardTitle>
          <CardDescription>Closest relief points to your zone</CardDescription>
        </div>
        <Home className="size-4 text-muted-foreground" />
      </CardHeader>

      {isError ? (
        <CardContent>
          <ErrorState context="nearby shelters" detail={error?.message} onRetry={refetch} retrying={isRefetching} compact />
        </CardContent>
      ) : (
        <>
          <CardContent className="divide-y divide-border p-0">
            {shelters.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{s.name}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <DataText className="text-2xs">{s.distanceKm} km</DataText>
                    <span>·</span>
                    <span>Capacity {s.capacity}</span>
                  </div>
                </div>
                <StatusChip variant={STATUS_VARIANT[s.status]}>{s.status}</StatusChip>
              </div>
            ))}
            {shelters.length === 0 && (
              <div className="p-5 text-center">
                <Muted>No shelter data for your zone yet.</Muted>
              </div>
            )}
          </CardContent>
          <Link
            to={ROUTES.MAP}
            className="flex items-center gap-1.5 border-t border-border px-3.5 py-2 text-xs font-medium text-primary hover:bg-accent/40"
          >
            <MapIcon className="size-3.5" /> View full map
          </Link>
        </>
      )}
    </Card>
  );
}

export default NearbyShelters;
