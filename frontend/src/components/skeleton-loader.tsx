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
        "flex min-h-[40vh] flex-col items-center justify-center gap-4 border border-ink/15 bg-paper-deep/40 py-16",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-ink/40" />
        <span className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
          {label}
        </span>
        <span className="h-px w-8 bg-ink/40" />
      </div>
      <div className="flex w-full max-w-md flex-col gap-2 px-6">
        <div className="h-3 animate-pulse bg-ink/10" />
        <div className="h-3 w-4/5 animate-pulse bg-ink/10" />
        <div className="h-3 w-2/3 animate-pulse bg-ink/10" />
      </div>
    </div>
  );
}
