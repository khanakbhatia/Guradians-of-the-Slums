import { AlertTriangle, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Standard "this query failed" state — one compact, contextual row.
 * Never a big red alert card: a backend hiccup is routine, not an
 * incident, and repeating alarm-red chrome everywhere trains people to
 * ignore real alerts.
 *
 * `context` is a short noun phrase completing "Unable to load ___"
 * (e.g. "nearby shelters", "recent alerts") — every call site should
 * pass one so the message is specific, per section, not generic.
 * `detail` is the real underlying error (e.g. from axios) — shown in
 * smaller, de-emphasized text right after, so the real error is never
 * hidden, just not shouted.
 */
function ErrorState({ context, detail, onRetry, retrying = false, compact = false, className }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground",
        compact ? "py-1.5" : "py-5",
        className
      )}
    >
      <AlertTriangle className="size-3.5 shrink-0 text-warning" />
      <span>
        Unable to load {context || "this data"}
        {detail && <span className="text-2xs text-muted-foreground/70"> — {detail}</span>}
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline disabled:opacity-50"
        >
          <RefreshCw className={cn("size-3", retrying && "animate-spin")} />
          {retrying ? "Retrying…" : "Retry"}
        </button>
      )}
    </div>
  );
}

export default ErrorState;
