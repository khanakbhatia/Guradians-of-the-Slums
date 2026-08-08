import { Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { incidentDetailsPath } from "@/constants";
import { useAuthorityIncidentFeed } from "@/hooks/queries/useAuthorityQueries";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusChip } from "@/components/ui/status-chip";
import { DataText, Muted } from "@/components/ui/typography";
import { TableCardSkeleton } from "@/components/common/skeletons";
import ErrorState from "@/components/common/ErrorState";
import { SEVERITY_VARIANT } from "@/constants/variants";


function IncidentFeed() {
  const navigate = useNavigate();
  const { data: incidents, isLoading, isError, error, refetch, isRefetching } = useAuthorityIncidentFeed();

  if (isLoading) return <TableCardSkeleton rows={5} columns={7} />;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Incident feed</CardTitle>
          <CardDescription>Live stream of reported incidents — click a row for details</CardDescription>
        </div>
        <Activity className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-0">
        {isError ? (
          <div className="p-4">
            <ErrorState context="the incident feed" detail={error?.message} onRetry={refetch} retrying={isRefetching} />
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-5 text-center">
            <Muted>No incidents reported yet.</Muted>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Reported</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map((inc) => (
                <TableRow
                  key={inc.id}
                  className="cursor-pointer"
                  onClick={() => navigate(incidentDetailsPath(inc.id))}
                >
                  <TableCell><DataText>{inc.id}</DataText></TableCell>
                  <TableCell>{inc.zone}</TableCell>
                  <TableCell className="text-muted-foreground">{inc.type}</TableCell>
                  <TableCell>
                    <StatusChip variant={SEVERITY_VARIANT[inc.severity]}>{inc.severity}</StatusChip>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{inc.team}</TableCell>
                  <TableCell><DataText>{inc.eta}</DataText></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{inc.time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default IncidentFeed;
