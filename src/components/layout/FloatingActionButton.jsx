import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ClipboardCheck, Map as MapIcon, Plus, Siren, Users, X } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { ROLES, ROUTES } from "@/constants";
import { cn } from "@/lib/utils";
import ReportIncidentDialog from "@/components/dashboard/citizen/ReportIncidentDialog";

const ROLE_ACTIONS = {
  [ROLES.AUTHORITY]: [
    { label: "Incident feed", icon: Siren, href: ROUTES.DASHBOARD_AUTHORITY },
    { label: "Live map", icon: MapIcon, href: ROUTES.MAP },
  ],
  [ROLES.VOLUNTEER]: [
    { label: "Nearby requests", icon: Users, href: ROUTES.DASHBOARD_VOLUNTEER },
    { label: "Assigned zones", icon: MapIcon, href: ROUTES.MAP },
  ],
  [ROLES.ADMIN]: [
    { label: "Overview", icon: ClipboardCheck, href: ROUTES.DASHBOARD_ADMIN },
    { label: "Live map", icon: MapIcon, href: ROUTES.MAP },
  ],
};

/**
 * MOBILE/TABLET ONLY (below lg) — desktop already has full sidebar +
 * navbar affordances, so the FAB would be redundant there.
 *
 * Citizens/volunteers get a direct "Report" action (reuses
 * ReportIncidentDialog in its default uncontrolled mode via a custom
 * trigger). Authority/Admin get a small speed-dial of shortcuts, since
 * "report" isn't their primary action.
 */
function FloatingActionButton() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const isReporter = user.role === ROLES.CITIZEN || user.role === ROLES.VOLUNTEER;
  const actions = ROLE_ACTIONS[user.role] ?? [];

  if (isReporter) {
    return (
      <div className="fixed bottom-20 right-4 z-40 lg:hidden">
        <ReportIncidentDialog
          trigger={
            <button
              aria-label="Report an incident"
              className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-panel transition-transform active:scale-95"
            >
              <Siren className="size-6" />
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2 lg:hidden">
      <AnimatePresence>
        {open &&
          actions.map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.15, delay: i * 0.03 }}
              onClick={() => {
                navigate(action.href);
                setOpen(false);
              }}
              className="flex items-center gap-2 rounded-full border border-border-strong bg-popover py-2 pl-3 pr-4 text-sm font-medium text-foreground shadow-panel active:scale-95"
            >
              <action.icon className="size-4 text-primary" />
              {action.label}
            </motion.button>
          ))}
      </AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close quick actions" : "Open quick actions"}
        className={cn(
          "flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-panel transition-transform active:scale-95"
        )}
      >
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}>
          {open ? <X className="size-6" /> : <Plus className="size-6" />}
        </motion.span>
      </button>
    </div>
  );
}

export default FloatingActionButton;
