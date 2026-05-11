import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";

type Props = {
  label: string;
  value: string;
  delta?: string | null;
  positive?: boolean;
};

export function KpiCard({ label, value, delta, positive = true }: Props) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-2 text-3xl font-bold leading-tight text-foreground">{value}</div>
        {delta && (
          <div
            className={cn(
              "mt-2 inline-flex items-center gap-1 text-sm font-semibold",
              positive ? "text-brand-700" : "text-red-600",
            )}
          >
            {positive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {delta}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
