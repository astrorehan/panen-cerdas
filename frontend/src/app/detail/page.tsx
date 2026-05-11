import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SectionRule } from "@/components/section-rule";
import { api } from "@/lib/api";
import { formatNumber, STATUS_COLOR, STATUS_LABEL } from "@/lib/utils";
import { NdviChart } from "./ndvi-chart";
import { BacktestChart } from "./backtest-chart";
import { KecamatanSelect } from "./select";

export const dynamic = "force-dynamic";

type SearchParams = { id?: string };

export default async function DetailPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { id } = await searchParams;
  const list = await api.predictions.list().catch(() => null);
  if (!list) {
    return (
      <div className="border border-ink/20 bg-paper-deep p-10 text-center font-display italic text-ink">
        Backend tidak terhubung.
      </div>
    );
  }
  const selectedId = id ?? list.items[0]?.id;
  const detail = selectedId ? await api.predictions.detail(selectedId).catch(() => null) : null;
  const selectedPred = list.items.find((it) => it.id === selectedId);

  return (
    <div className="space-y-10">
      <SectionRule
        numeral="03"
        eyebrow="Profil Kecamatan"
        title="Bedah satu kecamatan"
        caption="Time series NDVI, prediksi yield, dan backtest historis terhadap data resmi BPS."
      />

      <div className="flex flex-wrap items-end justify-between gap-4 border-y border-ink/20 bg-paper-deep/50 px-5 py-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
            Subjek
          </div>
          <div
            className="font-display text-3xl italic leading-none text-ink"
            style={{ fontVariationSettings: '"opsz" 72, "SOFT" 50' }}
          >
            {detail?.kecamatan ?? "—"}
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
            Kab. {detail?.kabupaten ?? "—"} · {list.province}
          </div>
        </div>
        <KecamatanSelect options={list.items} currentId={selectedId} />
      </div>

      {!detail ? (
        <div className="border border-ink/20 bg-paper-deep p-10 text-center font-display italic text-ink-soft">
          Pilih kecamatan untuk memuat detail.
        </div>
      ) : (
        <>
          {/* Big numerals row */}
          <div className="grid divide-y divide-rule sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <Numeral
              label="Yield Prediksi"
              numeral={detail.yield_pred_ton_per_ha.toFixed(2)}
              unit="ton/ha"
              index={0}
            />
            <Numeral
              label="Luas Panen"
              numeral={formatNumber(detail.luas_panen_ha)}
              unit="hektar"
              index={1}
            />
            <Numeral
              label="Total Produksi"
              numeral={formatNumber(detail.total_produksi_ton)}
              unit="ton"
              index={2}
            />
          </div>

          {/* Status banner */}
          {selectedPred && (
            <div
              className="flex flex-wrap items-center justify-between gap-4 border border-ink/20 bg-paper-deep px-5 py-4"
              style={{ borderLeftColor: STATUS_COLOR[selectedPred.status], borderLeftWidth: 6 }}
            >
              <div>
                <div className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
                  Status Pangan
                </div>
                <div
                  className="font-display text-2xl italic leading-none"
                  style={{
                    color: STATUS_COLOR[selectedPred.status],
                    fontVariationSettings: '"opsz" 48, "SOFT" 50',
                  }}
                >
                  {STATUS_LABEL[selectedPred.status]}
                </div>
              </div>
              <div className="text-right font-mono text-[11px] uppercase tracking-smallcaps text-ink-soft">
                <div>
                  Surplus / Defisit ·{" "}
                  <span className="text-ink">
                    {selectedPred.surplus_pct > 0 ? "+" : ""}
                    {selectedPred.surplus_pct.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1">
                  Threshold · surplus &gt; +10 · defisit &lt; −10
                </div>
              </div>
            </div>
          )}

          <Card className="animate-ink-rise stagger-2">
            <CardHeader>
              <CardTitle>NDVI Time Series</CardTitle>
              <CardDescription>
                Sentinel-2 L2A · 2018 → 2024 · rerata bulanan per kecamatan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NdviChart series={detail.ndvi_series} />
            </CardContent>
          </Card>

          <Card className="animate-ink-rise stagger-3">
            <CardHeader>
              <CardTitle>Backtest · Prediksi vs Aktual</CardTitle>
              <CardDescription>
                Validasi model XGBoost terhadap data BPS tahun sebelumnya
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BacktestChart points={detail.backtest} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Numeral({
  label,
  numeral,
  unit,
  index,
}: {
  label: string;
  numeral: string;
  unit: string;
  index: number;
}) {
  return (
    <div className={`relative flex flex-col gap-2 py-5 pl-5 pr-3 animate-ink-rise stagger-${index + 1}`}>
      <span className="absolute left-0 top-0 h-6 w-px bg-ink" aria-hidden />
      <span className="absolute left-0 top-0 h-px w-6 bg-ink" aria-hidden />
      <div className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className="font-display italic text-ink leading-none"
          style={{
            fontSize: "clamp(2.6rem, 2.8vw + 1.4rem, 4rem)",
            fontVariationSettings: '"opsz" 144, "SOFT" 30, "WONK" 0',
          }}
        >
          {numeral}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-smallcaps text-ink-soft">
          {unit}
        </span>
      </div>
    </div>
  );
}
