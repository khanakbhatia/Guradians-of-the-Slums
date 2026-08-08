import { ShieldHalf } from "lucide-react";

import { Muted } from "@/components/ui/typography";
import { Card } from "@/components/ui/card";

/**
 * Shell used by Login / Register / Forgot Password. Flat, bordered,
 * consistent with the rest of the system — no gradient blobs or glass
 * effects; this is a civic tool, not a marketing entry point.
 */
function AuthCard({ title, subtitle, children, footer, wide = false }) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
      <div className={`w-full ${wide ? "max-w-md" : "max-w-sm"}`}>
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="mb-3 flex size-9 items-center justify-center rounded-sm border border-border bg-secondary text-primary">
            <ShieldHalf className="size-4" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle && <Muted className="mt-1">{subtitle}</Muted>}
        </div>

        <Card variant="elevated">
          <div className="p-5">{children}</div>
        </Card>

        {footer && <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}

export default AuthCard;
