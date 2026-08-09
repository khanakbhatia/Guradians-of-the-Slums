import * as React from "react";
import { useState } from "react";
import { Check, X, FileText, Calendar, ShieldCheck, Mail, Phone, User, ChevronLeft, ChevronRight } from "lucide-react";

import {
  usePendingVolunteers,
  useApproveVolunteer,
  useRejectVolunteer,
} from "@/hooks/queries/useAdminQueries";

import DashboardHeader from "@/components/common/DashboardHeader";
import ErrorState from "@/components/common/ErrorState";
import { ListCardSkeleton } from "@/components/common/skeletons";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

function VolunteerApprovals() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch, isRefetching } = usePendingVolunteers(page);
  
  const approveMutation = useApproveVolunteer();
  const rejectMutation = useRejectVolunteer();

  const [confirmAction, setConfirmAction] = useState(null); // { type: 'approve' | 'reject', volunteerId, name }

  const handleAction = (type, volunteerId, name) => {
    setConfirmAction({ type, volunteerId, name });
  };

  const executeAction = async () => {
    if (!confirmAction) return;

    const { type, volunteerId, name } = confirmAction;
    try {
      if (type === "approve") {
        await approveMutation.mutateAsync(volunteerId);
        toast({
          variant: "success",
          title: "Volunteer Approved",
          description: `${name} has been approved and verified successfully.`,
        });
      } else {
        await rejectMutation.mutateAsync(volunteerId);
        toast({
          variant: "destructive",
          title: "Volunteer Rejected",
          description: `${name}'s application was rejected and their user account deactivated.`,
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Action failed",
        description: err?.message || "An unexpected error occurred.",
      });
    } finally {
      setConfirmAction(null);
    }
  };

  const pendingList = data?.volunteers || [];
  const meta = data?.meta || {};

  return (
    <div className="space-y-6">
      <DashboardHeader subtitle="Review and verify newly registered volunteer profiles." />

      {isLoading && <ListCardSkeleton />}

      {isError && (
        <ErrorState
          context="pending volunteers"
          detail={error?.message}
          onRetry={refetch}
          retrying={isRefetching}
        />
      )}

      {!isLoading && !isError && (
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-base font-semibold">Registration Queue</CardTitle>
              <CardDescription>
                Review skills and documents before authorizing portal access.
              </CardDescription>
            </div>
            <StatusChip variant={pendingList.length > 0 ? "warning" : "success"} dot pulse={pendingList.length > 0}>
              {meta.totalItems ?? pendingList.length} Pending
            </StatusChip>
          </CardHeader>
          <CardContent className="p-0">
            {pendingList.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 border-t border-border p-6 text-center">
                <ShieldCheck className="size-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">Clean Queue</p>
                <p className="text-xs text-muted-foreground">All volunteer applications have been processed.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border-t border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Volunteer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Skills</TableHead>
                      <TableHead>Document / Verification</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead className="w-[120px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingList.map((item) => {
                      const user = item.user || {};
                      const skills = item.skills || [];
                      const regDate = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—";
                      
                      return (
                        <TableRow key={item._id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                                {user.avatar?.url ? (
                                  <img
                                    src={user.avatar.url}
                                    alt={user.name}
                                    className="h-full w-full rounded-full object-cover"
                                  />
                                ) : (
                                  <User className="size-4" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">{user.name || "Anonymous"}</p>
                                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                  <Mail className="size-3 shrink-0" /> {user.email || "No Email"}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            <span className="flex items-center gap-1">
                              <Phone className="size-3 text-muted-foreground" />
                              {user.phone || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {skills.map((skill) => (
                                <StatusChip key={skill} variant="info" dot={false} className="normal-case">
                                  {skill}
                                </StatusChip>
                              ))}
                              {skills.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.verificationDocument?.url ? (
                              <a
                                href={item.verificationDocument.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                              >
                                <FileText className="size-3" />
                                View Document
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No document uploaded</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 whitespace-nowrap">
                              <Calendar className="size-3" />
                              {regDate}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex gap-1.5">
                              <Button
                                size="icon"
                                variant="outline"
                                className="size-8 text-success hover:bg-success/10 hover:text-success"
                                onClick={() => handleAction("approve", item._id, user.name)}
                                title="Approve volunteer"
                              >
                                <Check className="size-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleAction("reject", item._id, user.name)}
                                title="Reject volunteer"
                              >
                                <X className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {meta.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      Showing Page {page} of {meta.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!meta.hasPrevPage}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="size-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!meta.hasNextPage}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                        <ChevronRight className="size-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogTitle className="text-base font-semibold">
            {confirmAction?.type === "approve" ? "Confirm Approval" : "Confirm Rejection"}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            {confirmAction?.type === "approve"
              ? `Are you sure you want to approve the volunteer profile for ${confirmAction?.name}? This will verify their account and authorize full portal access.`
              : `Are you sure you want to reject ${confirmAction?.name}? This will deactivate their user account and block dashboard access.`}
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-3">
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant={confirmAction?.type === "approve" ? "default" : "destructive"}
              size="sm"
              onClick={executeAction}
              disabled={approveMutation.isPending || rejectMutation.isPending}
            >
              {confirmAction?.type === "approve" ? "Approve Profile" : "Reject Application"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default VolunteerApprovals;
