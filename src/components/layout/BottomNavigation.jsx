import { NavLink } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { bottomNavItems } from "@/components/layout/navConfig";

/**
 * MOBILE/TABLET ONLY (below lg). Fixed bottom tab bar with the role's
 * top 3 destinations plus a trailing "More" tab that opens the full
 * MobileSidebar drawer. Safe-area aware for notched devices.
 */
function BottomNavigation({ onOpenMore }) {
  const { user } = useAuth();
  const items = bottomNavItems(user?.role);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid h-16 grid-cols-4">
        {items.map((item) => (
          <TabItem key={item.label} item={item} />
        ))}
        <button
          onClick={onOpenMore}
          className="flex min-h-11 flex-col items-center justify-center gap-1 text-muted-foreground transition-colors active:text-foreground"
        >
          <MoreHorizontal className="size-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </nav>
  );
}

function TabItem({ item }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.href}
      end
      className={({ isActive }) =>
        cn(
          "relative flex min-h-11 flex-col items-center justify-center gap-1 transition-colors",
          isActive ? "text-primary" : "text-muted-foreground active:text-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
          )}
          <span className="relative">
            <Icon className="size-5" />
            {item.badge && (
              <span className="absolute -right-1.5 -top-1.5 flex size-3.5 items-center justify-center rounded-full bg-destructive font-mono text-[8px] text-destructive-foreground">
                {item.badge}
              </span>
            )}
          </span>
          <span className="text-[10px] font-medium">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export default BottomNavigation;
