import { Radar } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { DataText, Muted } from "@/components/ui/typography";
import { SEVERITY_VARIANT } from "@/constants/variants";


function NearbyRequests({ requests, onClaim }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Nearby requests</CardTitle>
          <CardDescription>Unclaimed citizen reports near you</CardDescription>
        </div>
        <Radar className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="divide-y divide-border p-0">
        {requests.length === 0 && (
          <div className="p-8 text-center">
            <Muted>No unclaimed reports nearby right now.</Muted>
          </div>
        )}
        {requests.map((r) => (
          <div key={r.id} className="flex items-start gap-3 p-3.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <StatusChip variant={SEVERITY_VARIANT[r.priority]}>{r.priority}</StatusChip>
                <DataText className="text-2xs text-muted-foreground">{r.distanceKm} km away</DataText>
              </div>
              <div className="mt-1 text-sm font-medium text-foreground">{r.title}</div>
              <Muted className="mt-0.5">{r.zone} · {r.reportedBy} · {r.time}</Muted>
            </div>
            <Button size="sm" className="shrink-0" onClick={() => onClaim(r.id)}>
              Claim
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default NearbyRequests;
