import { useVolunteerTasks, useTaskAction, useNearbyRequests, useClaimRequest } from "@/hooks/queries/useVolunteerQueries";
import DashboardHeader from "@/components/common/DashboardHeader";
import VolunteerScoreCard from "@/components/dashboard/volunteer/VolunteerScoreCard";
import Availability from "@/components/dashboard/volunteer/Availability";
import AssignedTasks from "@/components/dashboard/volunteer/AssignedTasks";
import AcceptedTasks from "@/components/dashboard/volunteer/AcceptedTasks";
import CompletedTasks from "@/components/dashboard/volunteer/CompletedTasks";
import TaskTimeline from "@/components/dashboard/volunteer/TaskTimeline";
import Leaderboard from "@/components/dashboard/volunteer/Leaderboard";
import NearbyRequests from "@/components/dashboard/volunteer/NearbyRequests";
import { ListCardSkeleton } from "@/components/common/skeletons";
import ErrorState from "@/components/common/ErrorState";
import { toast } from "@/hooks/use-toast";

/**
 * Volunteer Dashboard — composed entirely from src/components/dashboard/volunteer/*.
 * Tasks and nearby requests come from the API (useVolunteerTasks,
 * useNearbyRequests); accept/decline/complete/claim are mutations
 * (useTaskAction, useClaimRequest). Presentational subcomponents are
 * unchanged — they just receive real data instead of dummy fixtures.
 */
function VolunteerDashboard() {
  const tasksQuery = useVolunteerTasks();
  const requestsQuery = useNearbyRequests();
  const taskAction = useTaskAction();
  const claimRequest = useClaimRequest();

  const tasks = tasksQuery.data ?? [];
  const assigned = tasks.filter((t) => t.status === "assigned");
  const accepted = tasks.filter((t) => t.status === "accepted");
  const completed = tasks.filter((t) => t.status === "completed");

  function runAction(id, action, successCopy) {
    taskAction.mutate(
      { id, action },
      {
        onSuccess: () => toast(successCopy),
        onError: (err) =>
          toast({ variant: "destructive", title: "Action failed", description: err?.message }),
      }
    );
  }

  function handleAccept(id) {
    runAction(id, "accept", { variant: "success", title: "Task accepted", description: id });
  }

  function handleDecline(id) {
    const task = tasks.find((t) => t.id === id);
    runAction(id, "decline", { variant: "destructive", title: "Task declined", description: task?.title });
  }

  function handleComplete(id) {
    runAction(id, "complete", { variant: "success", title: "Task marked complete", description: id });
  }

  function handleClaim(id) {
    const req = (requestsQuery.data ?? []).find((r) => r.id === id);
    claimRequest.mutate(id, {
      onSuccess: () => toast({ variant: "success", title: "Request claimed", description: req?.title }),
      onError: (err) => toast({ variant: "destructive", title: "Couldn't claim request", description: err?.message }),
    });
  }

  return (
    <div className="space-y-6">
      <DashboardHeader subtitle="Your assigned zones, tasks, and standing in the network." />

      <VolunteerScoreCard />

      <div className="grid gap-4 lg:grid-cols-3">
        <Availability />
        <TaskTimeline />
        <Leaderboard />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {tasksQuery.isLoading && (
          <>
            <ListCardSkeleton rows={3} />
            <ListCardSkeleton rows={3} />
          </>
        )}
        {tasksQuery.isError && (
          <div className="lg:col-span-2">
            <ErrorState
              context="your tasks"
              detail={tasksQuery.error?.message}
              onRetry={tasksQuery.refetch}
              retrying={tasksQuery.isRefetching}
            />
          </div>
        )}
        {tasksQuery.isSuccess && (
          <>
            <AssignedTasks tasks={assigned} onAccept={handleAccept} onDecline={handleDecline} />
            <AcceptedTasks tasks={accepted} onComplete={handleComplete} />
          </>
        )}
      </div>

      {requestsQuery.isLoading && <ListCardSkeleton rows={3} />}
      {requestsQuery.isError && (
        <ErrorState
          context="nearby requests"
          detail={requestsQuery.error?.message}
          onRetry={requestsQuery.refetch}
          retrying={requestsQuery.isRefetching}
        />
      )}
      {requestsQuery.isSuccess && <NearbyRequests requests={requestsQuery.data} onClaim={handleClaim} />}

      {tasksQuery.isSuccess && <CompletedTasks tasks={completed} />}
    </div>
  );
}

export default VolunteerDashboard;
