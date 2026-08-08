import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  LayoutDashboard,
  Map,
  Search,
  Settings,
  Siren,
  User,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { ROLES, ROLE_HOME_ROUTE, ROUTES } from "@/constants";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Eyebrow } from "@/components/ui/typography";

/** Static command registry. Swap for a real search index once there's a backend. */
function useCommands() {
  const { user } = useAuth();

  return useMemo(() => {
    const base = [
      { id: "dashboard", label: "Go to dashboard", icon: LayoutDashboard, href: user ? ROLE_HOME_ROUTE[user.role] : ROUTES.HOME, group: "Navigate" },
      { id: "map", label: "Live map", icon: Map, href: ROUTES.MAP, group: "Navigate" },
      { id: "profile", label: "Profile", icon: User, href: ROUTES.PROFILE, group: "Navigate" },
      { id: "settings", label: "Settings", icon: Settings, href: ROUTES.SETTINGS, group: "Navigate" },
    ];

    const roleExtras = {
      [ROLES.AUTHORITY]: [
        { id: "incidents", label: "Recent incidents", icon: Siren, href: ROUTES.DASHBOARD_AUTHORITY, group: "Authority" },
        { id: "analytics", label: "Zone analytics", icon: BarChart3, href: ROUTES.DASHBOARD_AUTHORITY, group: "Authority" },
      ],
      [ROLES.VOLUNTEER]: [
        { id: "tasks", label: "Active tasks", icon: Siren, href: ROUTES.DASHBOARD_VOLUNTEER, group: "Volunteer" },
        { id: "zones", label: "Assigned zones", icon: Map, href: ROUTES.DASHBOARD_VOLUNTEER, group: "Volunteer" },
      ],
      [ROLES.CITIZEN]: [
        { id: "report", label: "My reports", icon: Siren, href: ROUTES.DASHBOARD_CITIZEN, group: "Citizen" },
        { id: "nearby", label: "Nearby map", icon: Map, href: ROUTES.DASHBOARD_CITIZEN, group: "Citizen" },
      ],
    };

    return [...base, ...(roleExtras[user?.role] ?? [])];
  }, [user]);
}

/**
 * Cmd/Ctrl+K opens a searchable command palette. Self-contained: mount
 * once in the layout, and the keyboard shortcut works anywhere.
 */
function SearchCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const commands = useCommands();

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));
  const groups = filtered.reduce((acc, c) => {
    (acc[c.group] ??= []).push(c);
    return acc;
  }, {});

  function go(href) {
    navigate(href);
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
      >
        <Search className="size-4" />
      </button>

      <button
        onClick={() => setOpen(true)}
        className="group hidden w-full items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-secondary md:flex"
      >
        <Search className="size-3.5 shrink-0" />
        <span className="flex-1 text-left text-xs">Search incidents, zones, teams…</span>
        <kbd className="hidden rounded-sm border border-border-strong bg-muted px-1.5 py-0.5 font-mono text-2xs text-muted-foreground lg:inline-block">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showClose={false} className="top-[20%] max-w-lg translate-y-0 p-0">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
            <Search className="size-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or search…"
              aria-label="Search commands"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <kbd className="rounded-sm border border-border-strong bg-muted px-1.5 py-0.5 font-mono text-2xs text-muted-foreground">
              ESC
            </kbd>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {Object.keys(groups).length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">No results found.</div>
            )}
            {Object.entries(groups).map(([group, items]) => (
              <div key={group} className="mb-2 last:mb-0">
                <Eyebrow className="block px-2 py-1.5">{group}</Eyebrow>
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => go(item.href)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left text-sm text-foreground/90 transition-colors hover:bg-accent"
                    )}
                  >
                    <item.icon className="size-4 text-muted-foreground" />
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SearchCommand;
