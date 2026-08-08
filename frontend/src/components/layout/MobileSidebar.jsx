import { NavLink } from "react-router-dom";
import { ShieldHalf } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { ROUTES, ROLE_HOME_ROUTE } from "@/constants";
import { ACCOUNT_NAV, ROLE_NAV } from "@/components/layout/navConfig";
import { Eyebrow } from "@/components/ui/typography";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/**
 * TABLET/MOBILE ONLY (below lg). Full off-canvas drawer with always-
 * visible labels (no collapse state needed for an overlay). Opened via
 * the hamburger button in Navbar; swipe-to-dismiss/tap-outside comes
 * free from the underlying Radix Dialog overlay.
 */
function MobileSidebar({ open, onOpenChange }) {
  const { user } = useAuth();
  const primaryNav = ROLE_NAV[user?.role] ?? [];

  function close() {
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="max-w-[280px] p-0">
        <SheetHeader className="flex-row items-center gap-2 space-y-0">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-primary/15 text-primary">
            <ShieldHalf className="size-4" />
          </div>
          <SheetTitle>Guardians</SheetTitle>
        </SheetHeader>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          <div>
            <Eyebrow className="mb-1.5 block px-1">Workspace</Eyebrow>
            <ul className="space-y-1">
              {primaryNav.map((item) => (
                <li key={item.label}>
                  <NavItem item={item} onNavigate={close} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <Eyebrow className="mb-1.5 block px-1">Account</Eyebrow>
            <ul className="space-y-1">
              {ACCOUNT_NAV.map((item) => (
                <li key={item.label}>
                  <NavItem item={item} onNavigate={close} />
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="border-t border-border p-3">
          <NavLink
            to={user ? ROLE_HOME_ROUTE[user.role] : ROUTES.HOME}
            onClick={close}
            className="block text-center text-2xs text-muted-foreground"
          >
            Guardians of the Slums
          </NavLink>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function NavItem({ item, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.href}
      end
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          // min-h-11 keeps every row a comfortable ~44px touch target
          "relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground active:bg-accent hover:bg-accent hover:text-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
          )}
          <Icon className="size-4 shrink-0" />
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <span className="rounded-full bg-destructive/15 px-1.5 py-0.5 font-mono text-2xs text-destructive">
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export default MobileSidebar;
