import { cn } from "@/lib/utils";
import type { PredictResponse, RiskLevel, Provenance } from "@/types";

const RISK_STYLE: Record<RiskLevel, { dot: string; bg: string; label: string }> = {
  low: { dot: "bg-[#2A3D2F]", bg: "bg-[#2A3D2F]/10", label: "Risiko Rendah" },
  medium: { dot: "bg-[#D4933A]", bg: "bg-[#D4933A]/10", label: "Risiko Sedang" },
  high: { dot: "bg-[#A8442C]", bg: "bg-[#A8442C]/15", label: "Risiko Tinggi" },
};

const PROVENANCE_LABEL: Record<Provenance, string> = {
  manual: "Manual",
  estimated: "Estimasi GPS",
  default: "Asumsi Default",
  fallback: "Fallback (ML Offline)",
};

function Provenance({
  kind,
  source,
}: {
  kind: string;
  source: Provenance;
}) {
  return (
    <div className="flex flex-col gap-1 border border-ink/15 bg-paper px-3 py-2">
      <span className="font-mono text-[9px] uppercase tracking-smallcaps text-ink-faint">
        {kind}
      </span>
      <span className="font-display text-[13px] italic leading-tight text-ink">
        {PROVENANCE_LABEL[source]}
      </span>
    </div>
  );
}

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
    <article
      className={cn(
        "relative border border-ink/20 bg-paper-deep/55",
        isFallback && "border-dashed border-ink/40",
      )}
    >
      {/* Header */}
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule px-6 py-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
            § Pasal — Hasil Prediksi № {result.prediction_log_id}
          </div>
          <h2
            className="mt-1 font-display text-2xl italic text-ink"
            style={{ fontVariationSettings: '"opsz" 48, "SOFT" 40' }}
          >
            {cropType.charAt(0).toUpperCase() + cropType.slice(1)} ·{" "}
            {landAreaHa} ha
          </h2>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 border border-ink/15 px-3 py-1.5",
            risk.bg,
          )}
        >
          <span className={cn("h-2.5 w-2.5 rounded-full", risk.dot)} />
          <span className="font-mono text-[10px] uppercase tracking-smallcaps text-ink">
            {risk.label}
          </span>
        </div>
      </header>

      {/* Metrics grid */}
      <div className="grid divide-y divide-rule sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Metric
          label="Hari ke panen"
          value={`${result.harvest_days}`}
          unit="hari"
        />
        <Metric
          label="Hasil per ha"
          value={result.yield_ton_per_ha.toFixed(2)}
          unit="ton / ha"
        />
        <Metric
          label="Total estimasi"
          value={result.total_yield_ton.toFixed(2)}
          unit="ton"
          accent
        />
      </div>

      {/* Recommendations */}
      <section className="border-t border-rule px-6 py-5">
        <div className="meta-row">
          <span>§ Rekomendasi</span>
        </div>
        <ul className="mt-3 space-y-2">
          {result.recommendations.map((r, i) => (
            <li
              key={i}
              className="flex gap-3 font-display text-[15px] leading-relaxed text-ink-soft"
            >
              <span className="mt-2 h-px w-4 shrink-0 bg-ink/40" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Provenance + confidence */}
      <footer className="border-t border-rule bg-paper/60 px-6 py-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Provenance kind="Sumber Cuaca" source={result.climate_source} />
          <Provenance kind="Sumber NDVI" source={result.ndvi_source} />
          <div className="flex flex-col gap-1 border border-ink/15 bg-paper px-3 py-2">
            <span className="font-mono text-[9px] uppercase tracking-smallcaps text-ink-faint">
              Keyakinan Model
            </span>
            <span
              className="font-display text-2xl italic leading-none text-ink"
              style={{ fontVariationSettings: '"opsz" 48, "SOFT" 40' }}
            >
              {Math.round(result.confidence * 100)}%
            </span>
          </div>
        </div>
        {isFallback && (
          <p className="mt-3 font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
            Hasil dari fallback gateway — jalankan ml_service untuk akurasi penuh.
          </p>
        )}
      </footer>
    </article>
  );
}

function Metric({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn("px-6 py-5", accent && "bg-ink text-paper")}
      >
      <div
        className={cn(
          "font-mono text-[10px] uppercase tracking-smallcaps",
          accent ? "text-paper/60" : "text-ink-faint",
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-display leading-none",
          accent ? "text-paper" : "text-ink",
        )}
        style={{
          fontSize: "clamp(2rem, 3vw + 0.6rem, 3rem)",
          fontVariationSettings: '"opsz" 96, "SOFT" 30',
        }}
      >
        {value}
      </div>
      <div
        className={cn(
          "mt-1 font-mono text-[10px] uppercase tracking-smallcaps",
          accent ? "text-paper/60" : "text-ink-faint",
        )}
      >
        {unit}
      </div>
    </div>
  );
}
