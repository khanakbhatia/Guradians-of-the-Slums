import { Phone, MessageSquare, Users } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Muted } from "@/components/ui/typography";
import { initials } from "@/lib/utils";

function AssignedVolunteers({ volunteers }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Assigned volunteers</CardTitle>
          <CardDescription>Field team responding to this incident</CardDescription>
        </div>
        <Users className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="divide-y divide-border p-0">
        {volunteers.length === 0 && (
          <div className="p-8 text-center">
            <Muted>No one assigned yet — use Dispatch to assign a team.</Muted>
          </div>
        )}
        {volunteers.map((v) => (
          <div key={v.id} className="flex items-center gap-3 p-3.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-2xs font-medium text-primary">
              {initials(v.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">{v.name}</div>
              <Muted className="truncate">{v.role} · {v.team}</Muted>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button size="icon-sm" variant="outline" asChild aria-label="Call">
                <a href={`tel:${v.phone}`}>
                  <Phone className="size-3.5" />
                </a>
              </Button>
              <Button size="icon-sm" variant="outline" aria-label="Message">
                <MessageSquare className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default AssignedVolunteers;
