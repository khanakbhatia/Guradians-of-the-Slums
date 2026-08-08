import { Flame, HeartPulse, Phone, PhoneCall, Shield, ShieldAlert, UserRound } from "lucide-react";

import { useEmergencyContacts } from "@/hooks/queries/useCitizenQueries";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DataText, Muted } from "@/components/ui/typography";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorState from "@/components/common/ErrorState";

const ICONS = { Shield, Flame, HeartPulse, Phone, ShieldAlert, UserRound };

function EmergencyContacts() {
  const { data: contacts, isLoading, isError, error, refetch, isRefetching } = useEmergencyContacts();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Emergency contacts</CardTitle>
          <CardDescription>Tap to call directly</CardDescription>
        </div>
        <PhoneCall className="size-4 text-muted-foreground" />
      </CardHeader>

      {isError ? (
        <CardContent>
          <ErrorState context="emergency contacts" detail={error?.message} onRetry={refetch} retrying={isRefetching} compact />
        </CardContent>
      ) : (
        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}

          {!isLoading && contacts?.length === 0 && (
            <Muted className="col-span-2 sm:col-span-3">No emergency contacts on file.</Muted>
          )}

          {contacts?.map((c) => {
            const Icon = ICONS[c.icon];
            return (
              <a
                key={c.id}
                href={`tel:${c.number}`}
                className="flex flex-col items-start gap-1.5 border border-border p-3 transition-colors hover:border-primary/50 hover:bg-accent/40"
              >
                <Icon className="size-4 text-muted-foreground" />
                <div className="text-xs font-medium text-foreground">{c.label}</div>
                <DataText className="text-xs text-muted-foreground">{c.number}</DataText>
              </a>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}

export default EmergencyContacts;
