import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type = "text", ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-md border border-border-strong bg-secondary/40 px-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors",
      "focus-visible:outline-none focus-visible:border-primary/60 focus-visible:bg-secondary focus-visible:ring-1 focus-visible:ring-primary/40",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
