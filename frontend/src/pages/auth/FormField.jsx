import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

function FormField({ label, htmlFor, error, className, labelRight, children }) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between">
        <Label htmlFor={htmlFor} className="mb-0">
          {label}
        </Label>
        {labelRight}
      </div>
      {children}
      {error && (
        <div className="mt-1.5 flex items-center gap-1 text-2xs text-destructive">
          <AlertCircle className="size-3" />
          {error}
        </div>
      )}
    </div>
  );
}

/** Standard form input for auth pages — same tokens as ui/input.jsx. */
export function GlassInput({ className, error, ...props }) {
  return (
    <input
      className={cn(
        "flex h-9 w-full rounded-sm border bg-secondary/50 px-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors",
        "focus-visible:outline-none focus-visible:ring-1",
        error
          ? "border-destructive/60 focus-visible:border-destructive focus-visible:ring-destructive/40"
          : "border-border-strong focus-visible:border-primary/60 focus-visible:ring-primary/40",
        className
      )}
      {...props}
    />
  );
}

export default FormField;
