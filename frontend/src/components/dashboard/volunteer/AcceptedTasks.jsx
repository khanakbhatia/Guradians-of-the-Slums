import { CheckCircle2, ClipboardList } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { Muted } from "@/components/ui/typography";
import { SEVERITY_VARIANT } from "@/constants/variants";


function AcceptedTasks({ tasks, onComplete }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Accepted tasks</CardTitle>
          <CardDescription>In progress — mark complete when done</CardDescription>
        </div>
        <ClipboardList className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="divide-y divide-border p-0">
        {tasks.length === 0 && (
          <div className="p-8 text-center">
            <Muted>Nothing in progress right now.</Muted>
          </div>
        )}
        {tasks.map((task) => (
          <div key={task.id} className="flex items-start gap-3 p-3.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xs text-muted-foreground">{task.id}</span>
                <StatusChip variant={SEVERITY_VARIANT[task.priority]}>{task.priority}</StatusChip>
                <StatusChip variant="info">in progress</StatusChip>
              </div>
              <div className="mt-1 text-sm font-medium text-foreground">{task.title}</div>
              <Muted className="mt-0.5">{task.zone} · {task.eta}</Muted>
            </div>
            <Button size="sm" variant="outline" className="shrink-0" onClick={() => onComplete(task.id)}>
              <CheckCircle2 className="size-3.5" /> Complete
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default AcceptedTasks;
