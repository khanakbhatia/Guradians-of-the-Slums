import { createContext, useContext, useEffect, useRef, useState } from "react";

import { INITIAL_NOTIFICATIONS, NOTIFICATION_POOL, PRIORITY_META } from "@/data/notifications";
import { toast } from "@/hooks/use-toast";

const NotificationContext = createContext(undefined);

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `sim-${Date.now()}-${idCounter}`;
}

/**
 * REAL-TIME SIMULATION, not a real backend: every 15–25s this provider
 * randomly draws a template from NOTIFICATION_POOL, prepends it to the
 * list as unread, and fires a matching toast — demonstrating the UI
 * pattern for live notifications without any websocket/push service.
 */
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [simulating, setSimulating] = useState(true);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!simulating) return undefined;

    function scheduleNext() {
      const delay = 15000 + Math.random() * 10000; // 15–25s
      timeoutRef.current = setTimeout(() => {
        const template = NOTIFICATION_POOL[Math.floor(Math.random() * NOTIFICATION_POOL.length)];
        const notification = {
          id: nextId(),
          ...template,
          time: "Just now",
          read: false,
        };

        setNotifications((prev) => [notification, ...prev]);

        const meta = PRIORITY_META[notification.priority];
        toast({
          variant: meta.toastVariant,
          title: notification.title,
          description: notification.body,
        });

        scheduleNext();
      }, delay);
    }

    scheduleNext();
    return () => clearTimeout(timeoutRef.current);
  }, [simulating]);

  function markRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function removeNotification(id) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  function clearAll() {
    setNotifications([]);
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value = {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    removeNotification,
    clearAll,
    simulating,
    setSimulating,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within a NotificationProvider");
  return ctx;
}
