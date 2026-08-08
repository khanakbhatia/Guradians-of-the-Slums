import { cn } from "@/lib/utils";

/**
 * Skeleton — shimmering placeholder matching the "Command" surface
 * palette. Compose shapes (Skeleton.Text, .Circle, .Block) rather than
 * hand-writing divs so loading states stay visually consistent.
 */
function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("skeleton-shimmer rounded-md bg-muted", className)}
      {...props}
    />
  );
}

function SkeletonText({ lines = 3, className, lastLineWidth = "60%" }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3"
          style={{ width: i === lines - 1 ? lastLineWidth : "100%" }}
        />
      ))}
    </div>
  );
}

function SkeletonCircle({ size = 40, className }) {
  return (
    <Skeleton
      className={cn("rounded-full", className)}
      style={{ width: size, height: size }}
    />
  );
}

function SkeletonCard({ className }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
      <div className="flex items-center gap-3">
        <SkeletonCircle size={36} />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-2.5 w-1/4" />
        </div>
      </div>
      <div className="mt-4">
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

function SkeletonTableRow({ columns = 4 }) {
  return (
    <div className="flex items-center gap-4 border-b border-border px-4 py-3">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-3 flex-1" />
      ))}
    </div>
  );
}

Skeleton.Text = SkeletonText;
Skeleton.Circle = SkeletonCircle;
Skeleton.Card = SkeletonCard;
Skeleton.TableRow = SkeletonTableRow;

export { Skeleton };
