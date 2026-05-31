import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SkeletonLoaderProps {
  className?: string;
  label?: string;
}

// The original generic fallback loader
export function SkeletonLoader({
  className,
  label = "Memuat...",
}: SkeletonLoaderProps) {
  return (
    <div
      className={cn(
        "flex min-h-[40vh] flex-col items-center justify-center gap-5 rounded-3xl border border-border bg-surface p-12 shadow-card",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="flex w-full max-w-md flex-col gap-2.5">
        <div className="h-3 animate-pulse rounded-full bg-muted/60" />
        <div className="h-3 w-4/5 animate-pulse rounded-full bg-muted/60" />
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-muted/60" />
      </div>
    </div>
  );
}

// Basic block skeleton for customizable layouts
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-muted/60", className)}
      {...props}
    />
  );
}

// High-fidelity KPI Metric Card Skeleton
export function KpiSkeleton() {
  return (
    <div className="rounded-3xl border border-border bg-surface p-5 shadow-card space-y-4">
      <div className="flex justify-between items-start">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-10 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-44" />
      </div>
    </div>
  );
}

// High-fidelity Chart Card Skeleton
export function ChartSkeleton() {
  return (
    <div className="rounded-3xl border border-border bg-surface p-6 shadow-card space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="h-[250px] flex items-end justify-between gap-3 pt-6 border-b border-border/40 pb-2">
        <Skeleton className="h-[40%] w-[8%] rounded-t-lg" />
        <Skeleton className="h-[60%] w-[8%] rounded-t-lg" />
        <Skeleton className="h-[80%] w-[8%] rounded-t-lg" />
        <Skeleton className="h-[50%] w-[8%] rounded-t-lg" />
        <Skeleton className="h-[75%] w-[8%] rounded-t-lg" />
        <Skeleton className="h-[90%] w-[8%] rounded-t-lg" />
        <Skeleton className="h-[65%] w-[8%] rounded-t-lg" />
        <Skeleton className="h-[85%] w-[8%] rounded-t-lg" />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground pt-1">
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-8" />
      </div>
    </div>
  );
}

// High-fidelity Table / List Skeleton
export function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-3xl border border-border bg-surface/50 p-6 shadow-card space-y-4">
      <div className="flex items-center justify-between border-b border-border/80 pb-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="space-y-1.5 text-right">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// High-fidelity Map View Skeleton
export function MapSkeleton() {
  return (
    <div className="rounded-3xl border border-border bg-surface p-4 shadow-card space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className="relative h-[480px] w-full rounded-2xl overflow-hidden bg-muted/30 border border-border/60 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-muted/10 to-transparent animate-pulse" />
        {/* Mock Map Shapes */}
        <Skeleton className="absolute top-1/4 left-1/3 h-20 w-32 rounded-full opacity-40" />
        <Skeleton className="absolute top-1/2 left-1/4 h-24 w-40 rounded-full opacity-30" />
        <Skeleton className="absolute top-1/3 left-1/2 h-28 w-44 rounded-full opacity-40" />
        <Skeleton className="absolute top-1/2 left-2/3 h-16 w-28 rounded-full opacity-35" />
        <div className="absolute bottom-6 right-6 p-4 rounded-2xl bg-surface/90 border border-border/80 shadow-elevated w-48 space-y-3 backdrop-blur-md">
          <Skeleton className="h-4 w-24" />
          <div className="space-y-1.5">
            <div className="flex justify-between"><Skeleton className="h-3 w-12" /><Skeleton className="h-3 w-8" /></div>
            <div className="flex justify-between"><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-8" /></div>
            <div className="flex justify-between"><Skeleton className="h-3 w-14" /><Skeleton className="h-3 w-8" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
