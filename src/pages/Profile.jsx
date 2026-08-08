import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/constants";
import { initials } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { H2, Muted } from "@/components/ui/typography";

function Profile() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <H2>Profile</H2>
        <Muted>Your account details as stored on this device.</Muted>
      </div>

      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/15 font-mono text-lg font-medium text-primary">
            {initials(user?.name)}
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">{user?.name}</div>
            <div className="text-xs text-muted-foreground">{user?.email}</div>
            <StatusChip variant="primary" className="mt-2">
              {ROLE_LABELS[user?.role]}
            </StatusChip>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
          <CardDescription>Stored locally for this demo — no backend involved</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" defaultValue={user?.name} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue={user?.email} disabled />
          </div>
          <Button size="sm" disabled>
            Save changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default Profile;
