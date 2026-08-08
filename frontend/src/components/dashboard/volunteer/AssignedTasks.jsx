import { Check, ListTodo, X } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { Muted } from "@/components/ui/typography";
import { SEVERITY_VARIANT } from "@/constants/variants";


function AssignedTasks({ tasks, onAccept, onDecline }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Assigned tasks</CardTitle>
          <CardDescription>Awaiting your response</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <ListTodo className="size-4 text-muted-foreground" />
          {tasks.length > 0 && <StatusChip variant="warning">{tasks.length} new</StatusChip>}
        </div>
      </CardHeader>
      <CardContent className="divide-y divide-border p-0">
        {tasks.length === 0 && (
          <div className="p-8 text-center">
            <Muted>No new assignments right now.</Muted>
          </div>
        )}
        {tasks.map((task) => (
          <div key={task.id} className="flex items-start gap-3 p-3.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xs text-muted-foreground">{task.id}</span>
                <StatusChip variant={SEVERITY_VARIANT[task.priority]}>{task.priority}</StatusChip>
              </div>
              <div className="mt-1 text-sm font-medium text-foreground">{task.title}</div>
              <Muted className="mt-0.5">{task.zone} · {task.eta}</Muted>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button size="icon-sm" variant="success" onClick={() => onAccept(task.id)} aria-label="Accept">
                <Check className="size-3.5" />
              </Button>
              <Button size="icon-sm" variant="destructive" onClick={() => onDecline(task.id)} aria-label="Decline">
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default AssignedTasks;
