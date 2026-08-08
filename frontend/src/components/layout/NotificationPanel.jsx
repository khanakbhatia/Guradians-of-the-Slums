import { useState } from "react";
import { Bell, CheckCheck, Flame, Info, MapPin, UserPlus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Eyebrow, Muted } from "@/components/ui/typography";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const ICONS = { critical: Flame, info: Info, zone: MapPin, team: UserPlus };
const ICON_COLOR = {
  critical: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
  zone: "bg-primary/10 text-primary",
  team: "bg-success/10 text-success",
};

const INITIAL_NOTIFICATIONS = [
  { id: "n1", type: "critical", title: "Fire hazard reported", body: "Dharavi Sector 4 — verified by 2 residents", time: "2m ago", read: false },
  { id: "n2", type: "team", title: "Team Bravo dispatched", body: "En route to Govandi East, ETA 12 min", time: "18m ago", read: false },
  { id: "n3", type: "zone", title: "New zone advisory", body: "Heavy rain advisory issued for Sector 4", time: "1h ago", read: false },
  { id: "n4", type: "info", title: "Weekly report ready", body: "Your zone summary for last week is available", time: "5h ago", read: true },
];

/**
 * Self-contained notification bell + popover. State lives here for now
 * (mock data) — swap INITIAL_NOTIFICATIONS for a real query when a
 * backend exists, the UI won't need to change.
 */
function NotificationPanel() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const unreadCount = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function markRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-destructive font-mono text-[9px] font-medium text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[340px] p-0">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
          <span className="text-sm font-semibold text-foreground">Notifications</span>
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-1 text-2xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <CheckCheck className="size-3.5" /> Mark all read
          </button>
        </div>

        <div className="max-h-80 divide-y divide-border overflow-y-auto">
          {notifications.length === 0 && (
            <div className="p-6 text-center">
              <Muted>You're all caught up.</Muted>
            </div>
          )}
          {notifications.map((n) => {
            const Icon = ICONS[n.type];
            return (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={cn(
                  "flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors hover:bg-accent",
                  !n.read && "bg-primary/5"
                )}
              >
                <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", ICON_COLOR[n.type])}>
                  <Icon className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-medium text-foreground">{n.title}</span>
                    {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <Muted className="mt-0.5 line-clamp-2">{n.body}</Muted>
                  <Eyebrow className="mt-1 block">{n.time}</Eyebrow>
                </div>
              </button>
            );
          })}
        </div>

        <div className="border-t border-border p-2">
          <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationPanel;
