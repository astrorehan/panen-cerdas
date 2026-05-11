import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  delta?: string | null;
  positive?: boolean;
  index?: number;
};

/**
 * KPI as a typographic composition, not a card.
 * The number is the page furniture — big Fraunces italic.
 */
export function KpiCard({ label, value, delta, positive = true, index = 0 }: Props) {
  // Split into a leading numeral + trailing unit/suffix when the value contains a space.
  // e.g. "1.42 jt ton" -> numeral "1.42", unit "jt ton"
  const idx = value.indexOf(" ");
  const numeral = idx === -1 ? value : value.slice(0, idx);
  const unit = idx === -1 ? "" : value.slice(idx + 1);

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-2 py-5 pl-5 pr-3 animate-ink-rise",
        `stagger-${Math.min(index + 1, 7)}`,
      )}
    >
      {/* hairline on top-left like an L-bracket */}
      <span className="absolute left-0 top-0 h-6 w-px bg-ink" aria-hidden />
      <span className="absolute left-0 top-0 h-px w-6 bg-ink" aria-hidden />

      <div className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
        {label}
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className="font-display italic text-ink leading-none"
          style={{ fontSize: "clamp(2.4rem, 2.5vw + 1.6rem, 3.6rem)", fontVariationSettings: '"opsz" 144, "SOFT" 30, "WONK" 0' }}
        >
          {numeral}
        </span>
        {unit && (
          <span className="font-mono text-[11px] uppercase tracking-smallcaps text-ink-soft">
            {unit}
          </span>
        )}
      </div>

      {delta && (
        <div
          className={cn(
            "font-display text-[13px] italic",
            positive ? "text-moss" : "text-clay",
          )}
        >
          {positive ? "↗" : "↘"} {delta}
        </div>
      )}
    </div>
  );
}
