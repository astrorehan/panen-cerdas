import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  delta?: string | null;
  positive?: boolean;
  index?: number;
};

export function KpiCard({ label, value, delta, positive = true, index = 0 }: Props) {
  const idx = value.indexOf(" ");
  const numeral = idx === -1 ? value : value.slice(0, idx);
  const unit = idx === -1 ? "" : value.slice(idx + 1);

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-elevated animate-fade-in-up",
        `stagger-${Math.min(index + 1, 6)}`,
      )}
    >
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-4xl font-semibold tracking-tight text-foreground">
          {numeral}
        </span>
        {unit && (
          <span className="text-sm font-medium text-muted-foreground">{unit}</span>
        )}
      </div>

      {delta && (
        <div
          className={cn(
            "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            positive ? "bg-primary-soft text-primary" : "bg-destructive/12 text-destructive",
          )}
        >
          {positive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {delta}
        </div>
      )}
    </div>
  );
}
