import { Check, ClipboardCheck, X } from "lucide-react";

import { useApprovalQueue, useApprovalDecision } from "@/hooks/queries/useAuthorityQueries";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { Eyebrow, Muted } from "@/components/ui/typography";
import { ListCardSkeleton } from "@/components/common/skeletons";
import ErrorState from "@/components/common/ErrorState";
import { toast } from "@/hooks/use-toast";

/**
 * Approve/reject now hits the real API via useApprovalDecision — the
 * mutation optimistically drops the item from the cached queue on
 * success and surfaces a toast either way.
 */
function TaskApprovalQueue() {
  const { data: queue, isLoading, isError, error, refetch, isRefetching } = useApprovalQueue();
  const decision = useApprovalDecision();

  function resolve(item, outcome) {
    decision.mutate(
      { id: item.id, decision: outcome },
      {
        onSuccess: () => {
          toast({
            variant: outcome === "approved" ? "success" : "destructive",
            title: outcome === "approved" ? "Request approved" : "Request rejected",
            description: item.type,
          });
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Couldn't submit decision",
            description: err?.message,
          });
        },
      }
    );
  }

  if (isLoading) return <ListCardSkeleton rows={4} />;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Task approval queue</CardTitle>
          <CardDescription>Requests awaiting your sign-off</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <ClipboardCheck className="size-4 text-muted-foreground" />
          {!isError && queue.length > 0 && <StatusChip variant="warning">{queue.length} pending</StatusChip>}
        </div>
      </CardHeader>

      {isError ? (
        <CardContent>
          <ErrorState context="the approval queue" detail={error?.message} onRetry={refetch} retrying={isRefetching} />
        </CardContent>
      ) : (
        <CardContent className="divide-y divide-border p-0">
          {queue.length === 0 && (
            <div className="p-8 text-center">
              <Muted>Queue is clear — nothing awaiting approval.</Muted>
            </div>
          )}
          {queue.map((item) => {
            const isPending = decision.isPending && decision.variables?.id === item.id;
            return (
              <div key={item.id} className="flex items-start gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Eyebrow>{item.type}</Eyebrow>
                    <span className="text-2xs text-muted-foreground">{item.time}</span>
                  </div>
                  <div className="mt-1 text-sm text-foreground/90">{item.summary}</div>
                  <Muted className="mt-0.5">Requested by {item.requestedBy}</Muted>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    size="icon-sm"
                    variant="success"
                    disabled={isPending}
                    onClick={() => resolve(item, "approved")}
                    aria-label="Approve"
                  >
                    <Check className="size-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="destructive"
                    disabled={isPending}
                    onClick={() => resolve(item, "rejected")}
                    aria-label="Reject"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}

export default TaskApprovalQueue;
