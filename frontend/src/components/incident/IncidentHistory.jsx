import { ScrollText } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DataText, Muted } from "@/components/ui/typography";

function IncidentHistory({ history }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>History</CardTitle>
          <CardDescription>Full audit trail for this incident</CardDescription>
        </div>
        <ScrollText className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="divide-y divide-border p-0">
        {history.length === 0 && (
          <div className="p-5 text-center">
            <Muted>No history recorded yet.</Muted>
          </div>
        )}
        {history.map((h) => (
          <div key={h.id} className="flex items-start justify-between gap-4 p-3.5">
            <div className="min-w-0">
              <div className="text-sm text-foreground/90">{h.action}</div>
              <Muted className="mt-0.5">{h.actor}</Muted>
            </div>
            <DataText className="shrink-0 text-2xs text-muted-foreground">{h.time}</DataText>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default IncidentHistory;
