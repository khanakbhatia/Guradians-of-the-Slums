import { AlertTriangle, Clock, Siren, Users } from "lucide-react";

import { useAuthorityOverview } from "@/hooks/queries/useAuthorityQueries";
import StatCard, { StatStrip } from "@/components/common/StatCard";
import { StatGridSkeleton } from "@/components/common/skeletons";
import ErrorState from "@/components/common/ErrorState";

const ICONS = { Siren, AlertTriangle, Users, Clock };

function OverviewCards() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useAuthorityOverview();

  if (isLoading) return <StatGridSkeleton count={4} />;
  if (isError) {
    return <ErrorState context="overview stats" detail={error?.message} onRetry={refetch} retrying={isRefetching} />;
  }

  return (
    <StatStrip>
      {data.map((s) => (
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
  );
}

export default OverviewCards;
