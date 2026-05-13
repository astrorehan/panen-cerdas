import { Sparkles, Clock, Wheat, TrendingUp, Activity, CloudRain, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PredictResponse, RiskLevel, Provenance } from "@/types";

const RISK_STYLE: Record<
  RiskLevel,
  { ring: string; bg: string; text: string; label: string }
> = {
  low: { ring: "ring-primary/20", bg: "bg-primary-soft", text: "text-primary", label: "Risiko Rendah" },
  medium: { ring: "ring-amber/30", bg: "bg-amber/15", text: "text-amber", label: "Risiko Sedang" },
  high: { ring: "ring-destructive/30", bg: "bg-destructive/12", text: "text-destructive", label: "Risiko Tinggi" },
};

const PROVENANCE_LABEL: Record<Provenance, string> = {
  manual: "Manual",
  estimated: "Estimasi GPS",
  default: "Asumsi Default",
  fallback: "Fallback (ML Offline)",
};

interface ResultCardProps {
  result: PredictResponse;
  cropType: string;
  landAreaHa: number;
}

export function ResultCard({ result, cropType, landAreaHa }: ResultCardProps) {
  const risk = RISK_STYLE[result.risk_level];
  const isFallback =
    result.climate_source === "fallback" || result.ndvi_source === "fallback";

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-gradient-to-br from-primary-soft via-surface to-amber/10 px-6 py-5 md:px-8 md:py-6">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            Hasil prediksi #{result.prediction_log_id}
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {cropType.charAt(0).toUpperCase() + cropType.slice(1)} - {landAreaHa} ha
          </h2>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium ring-1",
            risk.bg,
            risk.text,
            risk.ring,
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", risk.bg.replace("/15", "").replace("/12", "").replace("-soft", ""))} />
          {risk.label}
        </div>
      </header>

      {/* Metrics */}
      <div className="grid gap-px bg-border sm:grid-cols-3">
        <Metric icon={Clock} label="Hari ke panen" value={`${result.harvest_days}`} unit="hari" />
        <Metric icon={Wheat} label="Hasil per hektar" value={result.yield_ton_per_ha.toFixed(2)} unit="ton/ha" />
        <Metric
          icon={TrendingUp}
          label="Total estimasi"
          value={result.total_yield_ton.toFixed(2)}
          unit="ton"
          accent
        />
      </div>

      {/* Recommendations */}
      <section className="border-t border-border px-6 py-6 md:px-8">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-sm font-semibold tracking-tight">Rekomendasi tindakan</h3>
        </div>
        <ul className="space-y-3">
          {result.recommendations.map((r, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Provenance + confidence */}
      <footer className="border-t border-border bg-muted/30 px-6 py-5 md:px-8">
        <div className="grid gap-3 sm:grid-cols-3">
          <ProvCard icon={CloudRain} kind="Sumber cuaca" source={result.climate_source} />
          <ProvCard icon={Leaf} kind="Sumber NDVI" source={result.ndvi_source} />
          <div className="rounded-xl border border-border bg-surface p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Activity className="h-3 w-3" />
              Keyakinan model
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold tracking-tight text-foreground">
                {Math.round(result.confidence * 100)}
              </span>
              <span className="text-xs text-muted-foreground">%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary-accent transition-all"
                style={{ width: `${Math.round(result.confidence * 100)}%` }}
              />
            </div>
          </div>
        </div>
        {isFallback && (
          <p className="mt-4 text-xs text-muted-foreground">
            Hasil dari fallback gateway - jalankan ml_service untuk akurasi penuh.
          </p>
        )}
      </footer>
    </article>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  unit,
  accent,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  unit: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "px-6 py-6",
        accent ? "bg-gradient-to-br from-primary to-primary-deep text-primary-foreground" : "bg-surface",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider",
          accent ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
      >
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">{value}</div>
      <div
        className={cn(
          "mt-1 text-xs",
          accent ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
      >
        {unit}
      </div>
    </div>
  );
}

function ProvCard({
  icon: Icon,
  kind,
  source,
}: {
  icon: typeof CloudRain;
  kind: string;
  source: Provenance;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {kind}
      </div>
      <div className="mt-2 text-sm font-semibold tracking-tight text-foreground">
        {PROVENANCE_LABEL[source]}
      </div>
    </div>
  );
}
