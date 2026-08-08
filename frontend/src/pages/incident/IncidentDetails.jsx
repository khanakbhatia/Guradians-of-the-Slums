import { useParams } from "react-router-dom";

import { useIncidentDetails, useIncidentAction } from "@/hooks/queries/useIncidentQueries";
import { toast } from "@/hooks/use-toast";

import IncidentHeader from "@/components/incident/IncidentHeader";
import IncidentImages from "@/components/incident/IncidentImages";
import IncidentRiskScore from "@/components/incident/IncidentRiskScore";
import AIExplanation from "@/components/incident/AIExplanation";
import IncidentTimeline from "@/components/incident/IncidentTimeline";
import AssignedVolunteers from "@/components/incident/AssignedVolunteers";
import IncidentChat from "@/components/incident/IncidentChat";
import IncidentHistory from "@/components/incident/IncidentHistory";
import { ChartCardSkeleton, ListCardSkeleton } from "@/components/common/skeletons";
import ErrorState from "@/components/common/ErrorState";

const ACTION_COPY = {
  escalate: { title: "Incident escalated", variant: "warning" },
  reassign: { title: "Reassignment requested", variant: "info" },
  dispatch: { title: "Team dispatched", variant: "success" },
  resolve: { title: "Incident marked resolved", variant: "success" },
};

/**
 * Incident Details — composed entirely from src/components/incident/*.
 * Data comes from the API (useIncidentDetails); action buttons hit
 * useIncidentAction. No backend integrated in this sandbox, so expect
 * loading → error/retry until a real API answers.
 */
function IncidentDetails() {
  const { id } = useParams();
  const { data: incident, isLoading, isError, error, refetch, isRefetching } = useIncidentDetails(id);
  const action = useIncidentAction(id);

  function handleAction(actionKey) {
    const copy = ACTION_COPY[actionKey];
    action.mutate(actionKey, {
      onSuccess: () => toast({ variant: copy.variant, title: copy.title, description: id }),
      onError: (err) =>
        toast({ variant: "destructive", title: "Action failed", description: err?.message }),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <ListCardSkeleton rows={1} />
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCardSkeleton height={220} className="lg:col-span-2" />
          <ChartCardSkeleton height={180} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCardSkeleton height={200} />
          <ChartCardSkeleton height={200} />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        context="this incident"
        detail={error?.message}
        onRetry={refetch}
        retrying={isRefetching}
      />
    );
  }

  return (
    <div className="space-y-6">
      <IncidentHeader incident={incident} onAction={handleAction} />

      <div className="grid gap-4 lg:grid-cols-3">
        <IncidentImages images={incident.images} className="lg:col-span-2" />
        <IncidentRiskScore riskScore={incident.riskScore} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AIExplanation aiExplanation={incident.aiExplanation} />
        <IncidentTimeline timeline={incident.timeline} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AssignedVolunteers volunteers={incident.assignedVolunteers} />
        <IncidentChat />
      </div>

      <IncidentHistory history={incident.history} />
    </div>
  );
}

export default IncidentDetails;
