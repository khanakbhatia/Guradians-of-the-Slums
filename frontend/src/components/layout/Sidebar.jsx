import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import { ChevronsLeft, ChevronsRight, ShieldHalf } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { ROUTES, ROLE_HOME_ROUTE } from "@/constants";
import { ACCOUNT_NAV, ROLE_NAV } from "@/components/layout/navConfig";
import { Eyebrow } from "@/components/ui/typography";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * DESKTOP ONLY (lg+). Collapsible icon-rail sidebar, expanded ~248px,
 * collapsed ~64px, animated with Framer Motion. On tablet/mobile,
 * MobileSidebar (a Sheet drawer) takes over — see DashboardLayout.
 */
function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth();
  const primaryNav = ROLE_NAV[user?.role] ?? [];

  return (
    <TooltipProvider delayDuration={200}>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 64 : 248 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-card lg:flex"
      >
        <NavLink
          to={user ? ROLE_HOME_ROUTE[user.role] : ROUTES.HOME}
          className="flex h-14 items-center gap-2 border-b border-border px-4"
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-primary/15 text-primary">
            <ShieldHalf className="size-4" />
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="truncate text-sm font-semibold tracking-tight text-foreground"
              >
                Guardians
              </motion.span>
            )}
          </AnimatePresence>
        </NavLink>

        <nav className="flex-1 space-y-5 overflow-y-auto px-2.5 py-4">
          <div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <Eyebrow className="mb-1.5 block px-2">Workspace</Eyebrow>
                </motion.div>
              )}
            </AnimatePresence>
            <ul className="space-y-0.5">
              {primaryNav.map((item) => (
                <li key={item.label}>
                  <NavItem item={item} collapsed={collapsed} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <Eyebrow className="mb-1.5 block px-2">Account</Eyebrow>
                </motion.div>
              )}
            </AnimatePresence>
            <ul className="space-y-0.5">
              {ACCOUNT_NAV.map((item) => (
                <li key={item.label}>
                  <NavItem item={item} collapsed={collapsed} />
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="border-t border-border p-2.5">
          <button
            onClick={onToggle}
            className="flex w-full items-center justify-center gap-2 rounded-sm py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {collapsed ? (
              <ChevronsRight className="size-4" />
            ) : (
              <>
                <ChevronsLeft className="size-4" />
                <AnimatePresence initial={false}>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    Collapse
                  </motion.span>
                </AnimatePresence>
              </>
            )}
          </button>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}

function NavItem({ item, collapsed }) {
  const Icon = item.icon;
  const content = (
    <NavLink
      to={item.href}
      end
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-2.5 rounded-sm px-2 py-2 text-sm transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
          )}
          <Icon className="size-4 shrink-0" />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="flex-1 truncate"
              >
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>
          {!collapsed && item.badge && (
            <span className="rounded-full bg-destructive/15 px-1.5 py-0.5 font-mono text-2xs text-destructive">
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  if (!collapsed) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export { Sidebar };
