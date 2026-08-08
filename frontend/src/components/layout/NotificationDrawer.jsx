import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  CheckCheck,
  ClipboardCheck,
  Info,
  MapPin,
  Search,
  Siren,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useNotifications } from "@/context/NotificationContext";
import { PRIORITY_META } from "@/data/notifications";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { Eyebrow, Muted } from "@/components/ui/typography";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

const TYPE_ICON = { incident: Siren, team: UserPlus, system: Info, zone: MapPin, task: ClipboardCheck };
const PRIORITY_ORDER = ["critical", "high", "medium", "low"];

/**
 * Bell trigger + full slide-over drawer. Reads/writes the shared
 * NotificationContext, so state stays in sync with any other consumer
 * (e.g. a future compact bell elsewhere in the app).
 */
function NotificationDrawer() {
  const { notifications, unreadCount, markRead, markAllRead, removeNotification } = useNotifications();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [readFilter, setReadFilter] = useState("all"); // all | unread
  const [priorityFilter, setPriorityFilter] = useState([]); // multi-select

  function togglePriority(p) {
    setPriorityFilter((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (readFilter === "unread" && n.read) return false;
      if (priorityFilter.length > 0 && !priorityFilter.includes(n.priority)) return false;
      if (query && !`${n.title} ${n.body}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [notifications, readFilter, priorityFilter, query]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Open notifications">
          <Bell className="size-4" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key={unreadCount}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-destructive font-mono text-[9px] font-medium text-destructive-foreground"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="max-w-sm p-0">
        <SheetHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <SheetTitle>Notifications</SheetTitle>
            <SheetDescription className="mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="space-y-3 border-b border-border p-3">
          <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-2.5 py-1.5">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notifications…"
              aria-label="Search notifications"
              className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search">
                <X className="size-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {["all", "unread"].map((f) => (
              <button
                key={f}
                onClick={() => setReadFilter(f)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-2xs font-medium capitalize transition-colors",
                  readFilter === f
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border-strong text-muted-foreground hover:bg-accent"
                )}
              >
                {f}
              </button>
            ))}
            <span className="mx-1 h-4 w-px bg-border" />
            {PRIORITY_ORDER.map((p) => (
              <button
                key={p}
                onClick={() => togglePriority(p)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-2xs font-medium transition-colors",
                  priorityFilter.includes(p)
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border-strong text-muted-foreground hover:bg-accent"
                )}
              >
                {PRIORITY_META[p].label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="flex items-center gap-1 text-2xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
            <Muted className="text-2xs">{filtered.length} shown</Muted>
          </div>
        </div>

        <div className="flex-1 divide-y divide-border overflow-y-auto">
          {filtered.length === 0 && (
            <div className="p-8 text-center">
              <Muted>No notifications match your filters.</Muted>
            </div>
          )}
          <AnimatePresence initial={false}>
            {filtered.map((n, i) => {
              const Icon = TYPE_ICON[n.type];
              const meta = PRIORITY_META[n.priority];
              return (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 24, height: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                  className={cn("group flex items-start gap-3 overflow-hidden px-4 py-3 transition-colors", !n.read && "bg-primary/5")}
                >
                  <button onClick={() => markRead(n.id)} className="flex flex-1 items-start gap-3 text-left">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Icon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium text-foreground">{n.title}</span>
                        {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                      </div>
                      <Muted className="mt-0.5 line-clamp-2">{n.body}</Muted>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <StatusChip variant={meta.variant} dot={false}>
                          {meta.label}
                        </StatusChip>
                        <Eyebrow>{n.time}</Eyebrow>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => removeNotification(n.id)}
                    aria-label="Dismiss notification"
                    className="mt-0.5 shrink-0 p-1 text-muted-foreground opacity-60 transition-opacity hover:text-destructive hover:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default NotificationDrawer;
