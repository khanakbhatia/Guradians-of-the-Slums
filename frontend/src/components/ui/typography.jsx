import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Typography primitives. IBM Plex Sans for UI/prose, IBM Plex Mono for
 * data, labels, and anything that reads as "system output" — the
 * distinguishing signal between narrative text and instrument readouts.
 */

const H1 = React.forwardRef(({ className, ...props }, ref) => (
  <h1
    ref={ref}
    className={cn(
      "font-sans text-4xl font-semibold tracking-tight text-foreground",
      className
    )}
    {...props}
  />
));
H1.displayName = "H1";

const H2 = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "font-sans text-2xl font-semibold tracking-tight text-foreground",
      className
    )}
    {...props}
  />
));
H2.displayName = "H2";

const H3 = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-sans text-xl font-semibold tracking-tight text-foreground",
      className
    )}
    {...props}
  />
));
H3.displayName = "H3";

const H4 = React.forwardRef(({ className, ...props }, ref) => (
  <h4
    ref={ref}
    className={cn("font-sans text-lg font-medium text-foreground", className)}
    {...props}
  />
));
H4.displayName = "H4";

const Text = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("font-sans text-base text-foreground/90", className)}
    {...props}
  />
));
Text.displayName = "Text";

const Muted = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("font-sans text-sm text-muted-foreground", className)}
    {...props}
  />
));
Muted.displayName = "Muted";

/** Small uppercase label — section eyebrows, field labels, panel titles. */
const Eyebrow = React.forwardRef(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "font-mono text-2xs font-medium uppercase tracking-[0.12em] text-muted-foreground",
      className
    )}
    {...props}
  />
));
Eyebrow.displayName = "Eyebrow";

/** Monospace readout — metrics, IDs, coordinates, timestamps. */
const DataText = React.forwardRef(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn("font-mono text-sm tabular-nums text-foreground", className)}
    {...props}
  />
));
DataText.displayName = "DataText";

/** Large monospace metric for stat panels. */
const Metric = React.forwardRef(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "font-mono text-3xl font-medium tabular-nums text-foreground",
      className
    )}
    {...props}
  />
));
Metric.displayName = "Metric";

const Code = React.forwardRef(({ className, ...props }, ref) => (
  <code
    ref={ref}
    className={cn(
      "rounded-sm bg-muted px-1.5 py-0.5 font-mono text-2xs text-foreground",
      className
    )}
    {...props}
  />
));
Code.displayName = "Code";

export { H1, H2, H3, H4, Text, Muted, Eyebrow, DataText, Metric, Code };
