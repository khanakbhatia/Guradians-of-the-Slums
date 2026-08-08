import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

import { cn } from "@/lib/utils";
import { ROUTE_BREADCRUMBS, ROUTES } from "@/constants";

function humanize(segment) {
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Fully self-contained — reads the current route and renders a trail.
 * Exact matches use the friendly labels in ROUTE_BREADCRUMBS; anything
 * else falls back to humanized URL segments so new routes never break
 * the layout.
 */
function Breadcrumbs({ className }) {
  const { pathname } = useLocation();

  const trail = ROUTE_BREADCRUMBS[pathname] ?? pathname.split("/").filter(Boolean).map(humanize);

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1.5 font-mono text-2xs text-muted-foreground", className)}>
      <Link to={ROUTES.HOME} className="flex items-center transition-colors hover:text-foreground">
        <Home className="size-3" />
      </Link>
      {trail.map((label, i) => {
        const isLast = i === trail.length - 1;
        return (
          <Fragment key={label + i}>
            <ChevronRight className="size-3 text-border-strong" />
            <span className={cn(isLast && "text-foreground")}>{label}</span>
          </Fragment>
        );
      })}
    </nav>
  );
}

export default Breadcrumbs;
