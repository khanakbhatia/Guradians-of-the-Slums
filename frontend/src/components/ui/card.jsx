import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Flat, bordered panels — instrument-panel feel, not app-card feel.
 * Corners are near-square (rounded-sm), shadows are minimal-to-none.
 * "highlight" replaces the old glowing-corner treatment: a plain
 * left-border accent stripe, the same device real ops/BI tools use to
 * flag the one panel that matters most on a screen.
 */
const cardVariants = cva("rounded-sm text-card-foreground transition-colors duration-150", {
  variants: {
    variant: {
      default: "bg-card border border-border",
      elevated: "bg-card border border-border-strong shadow-panel",
      /** Flags the single most important panel on a screen — colored left border, no glow. */
      highlight: "bg-card border border-border border-l-2 border-l-primary",
      /** No border/bg — groups content without adding chrome. */
      ghost: "bg-transparent",
      /** Clickable rows/cards — background shift on hover, no lift/glow. */
      interactive: "bg-card border border-border hover:border-border-strong hover:bg-accent/40 cursor-pointer",
    },
  },
  defaultVariants: { variant: "default" },
});

const Card = React.forwardRef(({ className, variant, ...props }, ref) => (
  <div ref={ref} className={cn(cardVariants({ variant, className }))} {...props} />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-0.5 border-b border-border px-3.5 py-2.5", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-[13px] font-semibold leading-none text-foreground", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-xs text-muted-foreground", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-3.5", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center border-t border-border px-3.5 py-2.5", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
