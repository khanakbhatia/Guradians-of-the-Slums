import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva } from "class-variance-authority";
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";

import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-20 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[380px] lg:bottom-0",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-md border bg-popover p-4 pr-8 shadow-panel data-[state=open]:animate-toast-in data-[swipe=end]:animate-out data-[state=closed]:fade-out-80",
  {
    variants: {
      variant: {
        neutral: "border-border [&_.toast-icon]:text-muted-foreground",
        success: "border-success/30 [&_.toast-icon]:text-success",
        warning: "border-warning/30 [&_.toast-icon]:text-warning",
        destructive: "border-destructive/30 [&_.toast-icon]:text-destructive",
        info: "border-info/30 [&_.toast-icon]:text-info",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

const iconMap = { neutral: Info, success: CheckCircle2, warning: AlertTriangle, destructive: XCircle, info: Info };

const Toast = React.forwardRef(({ className, variant = "neutral", ...props }, ref) => {
  const Icon = iconMap[variant];
  return (
    <ToastPrimitives.Root ref={ref} className={cn(toastVariants({ variant, className }))} {...props}>
      <Icon className="toast-icon mt-0.5 size-4 shrink-0" />
      <div className="flex-1 space-y-0.5">{props.children}</div>
    </ToastPrimitives.Root>
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-7 shrink-0 items-center rounded-sm border border-border-strong bg-transparent px-2.5 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-sm p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="size-3.5" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={cn("text-sm font-medium text-foreground", className)} {...props} />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Description ref={ref} className={cn("text-xs text-muted-foreground", className)} {...props} />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
