import { Crown, HeartHandshake, ShieldCheck, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";
import { ROLES, ROLE_LABELS } from "@/constants";
import { Label } from "@/components/ui/label";

const ROLE_ICON = {
  [ROLES.CITIZEN]: UserRound,
  [ROLES.VOLUNTEER]: HeartHandshake,
  [ROLES.AUTHORITY]: ShieldCheck,
  [ROLES.ADMIN]: Crown,
};

const ROLE_ORDER = [ROLES.CITIZEN, ROLES.VOLUNTEER, ROLES.AUTHORITY, ROLES.ADMIN];

function RoleSelect({ value, onChange, label = "I am joining as" }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        {ROLE_ORDER.map((role) => {
          const Icon = ROLE_ICON[role];
          const active = value === role;
          return (
            <button
              key={role}
              type="button"
              onClick={() => onChange(role)}
              className={cn(
                "flex items-center gap-2 rounded-sm border px-3 py-2.5 text-left text-sm transition-colors",
                active
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-border-strong bg-secondary/40 text-muted-foreground hover:bg-accent"
              )}
            >
              <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
              <span className="font-medium">{ROLE_LABELS[role]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default RoleSelect;
