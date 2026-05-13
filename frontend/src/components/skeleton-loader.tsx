import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SkeletonLoaderProps {
  className?: string;
  label?: string;
}

export function SkeletonLoader({
  className,
  label = "Memuat...",
}: SkeletonLoaderProps) {
  return (
    <div
      className={cn(
        "flex min-h-[40vh] flex-col items-center justify-center gap-5 rounded-2xl border border-border bg-surface p-12 shadow-card",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="flex w-full max-w-md flex-col gap-2.5">
        <div className="h-3 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-4/5 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}
