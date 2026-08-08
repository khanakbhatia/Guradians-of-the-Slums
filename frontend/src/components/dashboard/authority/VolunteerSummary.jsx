import { Users } from "lucide-react";

import { useVolunteerSummary } from "@/hooks/queries/useAuthorityQueries";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusChip } from "@/components/ui/status-chip";
import { DataText, Muted } from "@/components/ui/typography";
import { TableCardSkeleton } from "@/components/common/skeletons";
import ErrorState from "@/components/common/ErrorState";

const STATUS_VARIANT = { active: "success", "off-duty": "neutral", standby: "info" };

function VolunteerSummary() {
  const { data: teams, isLoading, isError, error, refetch, isRefetching } = useVolunteerSummary();

  if (isLoading) return <TableCardSkeleton rows={5} columns={5} />;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Volunteer summary</CardTitle>
          <CardDescription>Field team status and load</CardDescription>
        </div>
        <Users className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-0">
        {isError ? (
          <div className="p-4">
            <ErrorState context="the volunteer summary" detail={error?.message} onRetry={refetch} retrying={isRefetching} />
          </div>
        ) : teams.length === 0 ? (
          <div className="p-5 text-center">
            <Muted>No volunteer teams on record yet.</Muted>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tasks done</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium text-foreground">{t.name}</TableCell>
                  <TableCell className="text-muted-foreground">{t.zone}</TableCell>
                  <TableCell><DataText>{t.members}</DataText></TableCell>
                  <TableCell>
                    <StatusChip variant={STATUS_VARIANT[t.status]}>{t.status}</StatusChip>
                  </TableCell>
                  <TableCell><DataText>{t.tasksDone}</DataText></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default VolunteerSummary;
