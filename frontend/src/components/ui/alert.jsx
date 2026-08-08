import * as React from "react";
import { cva } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-md border p-3.5 pl-11 text-sm [&>svg]:absolute [&>svg]:left-3.5 [&>svg]:top-3.5 [&>svg]:size-4",
  {
    variants: {
      variant: {
        neutral: "bg-secondary/60 border-border text-foreground [&>svg]:text-muted-foreground",
        info: "bg-info/10 border-info/30 text-foreground [&>svg]:text-info",
        success: "bg-success/10 border-success/30 text-foreground [&>svg]:text-success",
        warning: "bg-warning/10 border-warning/30 text-foreground [&>svg]:text-warning",
        destructive: "bg-destructive/10 border-destructive/30 text-foreground [&>svg]:text-destructive",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

const iconMap = {
  neutral: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: XCircle,
};

const Alert = React.forwardRef(({ className, variant = "neutral", ...props }, ref) => {
  const Icon = iconMap[variant];
  return (
    <div ref={ref} role="alert" className={cn(alertVariants({ variant, className }))} {...props}>
      <Icon />
      {props.children}
    </div>
  );
});
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5 ref={ref} className={cn("mb-0.5 font-medium leading-none text-foreground", className)} {...props} />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm text-muted-foreground [&_p]:leading-relaxed", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
