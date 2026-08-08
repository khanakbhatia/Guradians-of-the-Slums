import { Menu } from "lucide-react";

import Breadcrumbs from "@/components/layout/Breadcrumbs";
import SearchCommand from "@/components/layout/SearchCommand";
import NotificationDrawer from "@/components/layout/NotificationDrawer";
import ThemeToggle from "@/components/layout/ThemeToggle";
import UserMenu from "@/components/layout/UserMenu";
import { StatusChip } from "@/components/ui/status-chip";

/**
 * Top bar for the dashboard shell. Every piece (breadcrumbs, search,
 * notifications, theme, account) reads its own state/context, so this
 * takes a single optional callback for the mobile hamburger and can be
 * reused unchanged across every dashboard.
 *
 * SearchCommand renders a single instance that swaps its own trigger
 * markup responsively (compact icon on mobile, full bar on desktop) —
 * mounting it twice would create two independent dialogs / keyboard
 * listeners, so there is intentionally only one <SearchCommand /> here.
 */
function Navbar({ onOpenMobileNav }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:gap-4 sm:px-5">
      <button
        onClick={onOpenMobileNav}
        aria-label="Open menu"
        className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      <Breadcrumbs className="hidden sm:flex" />

      <div className="md:mx-auto md:max-w-md md:flex-1">
        <SearchCommand />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1.5">
        <StatusChip variant="success" pulse className="hidden sm:inline-flex">
          Live
        </StatusChip>
        <ThemeToggle />
        <NotificationDrawer />
        <UserMenu />
      </div>
    </header>
  );
}

export { Navbar };
