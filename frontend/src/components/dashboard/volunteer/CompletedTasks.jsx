import { History } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusChip } from "@/components/ui/status-chip";
import { Muted } from "@/components/ui/typography";
import { SEVERITY_VARIANT } from "@/constants/variants";


function CompletedTasks({ tasks }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Completed tasks</CardTitle>
          <CardDescription>Your task history</CardDescription>
        </div>
        <History className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-0">
        {tasks.length === 0 ? (
          <div className="p-8 text-center">
            <Muted>No completed tasks yet.</Muted>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{task.id}</TableCell>
                  <TableCell className="text-foreground">{task.title}</TableCell>
                  <TableCell className="text-muted-foreground">{task.zone}</TableCell>
                  <TableCell>
                    <StatusChip variant={SEVERITY_VARIANT[task.priority]}>{task.priority}</StatusChip>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{task.completedAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default CompletedTasks;
