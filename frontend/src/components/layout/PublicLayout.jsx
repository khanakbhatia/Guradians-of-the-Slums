import { Link, Outlet } from "react-router-dom";
import { ShieldHalf } from "lucide-react";

import { ROUTES } from "@/constants";
import { Button } from "@/components/ui/button";
import PageTransition from "@/components/layout/PageTransition";

/**
 * Minimal top bar for unauthenticated surfaces: landing, login, register.
 * No sidebar — these pages aren't inside the product shell yet.
 */
function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <Link to={ROUTES.HOME} className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-sm bg-primary/15 text-primary">
              <ShieldHalf className="size-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Guardians of the Slums</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to={ROUTES.LOGIN}>Sign in</Link>
            </Button>
            <Button variant="default" size="sm" asChild>
              <Link to={ROUTES.REGISTER}>Get started</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  );
}

export default PublicLayout;
