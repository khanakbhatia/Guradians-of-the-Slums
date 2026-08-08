import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Status Chip — small pill used for status, severity, and category tags
 * across tables, cards, and lists. A leading dot (not an icon) keeps
 * dense tables calm; icons are opt-in via the `icon` prop.
 */
const chipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-2xs font-medium uppercase tracking-wide whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground border-border-strong",
        primary: "bg-primary/10 text-primary border-primary/30",
        success: "bg-success/10 text-success border-success/30",
        warning: "bg-warning/10 text-warning border-warning/30",
        destructive: "bg-destructive/10 text-destructive border-destructive/30",
        info: "bg-info/10 text-info border-info/30",
        outline: "bg-transparent text-foreground border-border-strong",
      },
      dot: {
        true: "",
        false: "",
      },
    },
    defaultVariants: { variant: "neutral", dot: true },
  }
);

const dotColor = {
  neutral: "bg-muted-foreground",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
  outline: "bg-foreground",
};

function StatusChip({ className, variant = "neutral", dot = true, pulse = false, icon: Icon, children, ...props }) {
  return (
    <span className={cn(chipVariants({ variant, className }))} {...props}>
      {Icon ? (
        <Icon className="size-3" />
      ) : dot ? (
        <span className="relative flex size-1.5">
          {pulse && (
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-pulse-ring rounded-full",
                dotColor[variant]
              )}
            />
          )}
          <span className={cn("relative inline-flex size-1.5 rounded-full", dotColor[variant])} />
        </span>
      ) : null}
      {children}
    </span>
  );
}

export { StatusChip, chipVariants };
