import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";
import { SectionRule } from "@/components/section-rule";
import { TrendChart } from "@/components/trend-chart";
import { RootGate } from "@/components/root-gate";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [summary, trend] = await Promise.all([
    api.dashboard.summary().catch(() => null),
    api.dashboard.trend().catch(() => null),
  ]);

  if (!summary || !trend) {
    return (
      <>
        <RootGate />
        <div className="border border-ink/20 bg-paper-deep p-10 text-center">
          <p className="font-display text-2xl italic text-ink">
            Backend tidak terhubung.
          </p>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-smallcaps text-ink-faint">
            Jalankan uvicorn ml_service.main:app --reload --port 8000
          </p>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-14">
      <RootGate />
      {/* ─────── HERO ─────── */}
      <section className="relative">
        {/* Coordinate frame top-right */}
        <div className="absolute right-0 top-0 hidden text-right font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint md:block">
          <div>Edisi № 01 / 04</div>
          <div className="mt-1">{summary.province}</div>
          <div className="mt-1">{summary.season}</div>
        </div>

        <div className="meta-row animate-fade-in">
          <span className="h-px w-12 bg-ink" />
          <span>§ Pasal I — Dasbor Eksekutif</span>
        </div>

        <h1
          className="mt-6 font-display leading-[0.85] text-ink animate-ink-rise"
          style={{
            fontSize: "clamp(3.2rem, 6vw + 1rem, 7.2rem)",
            fontVariationSettings: '"opsz" 144, "SOFT" 30, "WONK" 0',
          }}
        >
          <span>Indonesia,</span>
          <br />
          <span className="italic">memetakan panen</span>
          <br />
          <span className="italic">sebelum </span>
          <span className="italic text-moss">panen.</span>
        </h1>

        <div className="mt-7 grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <p className="max-w-prose font-display text-lg leading-relaxed text-ink-soft animate-ink-rise stagger-2">
            Buletin ini meringkas prediksi hasil panen padi {summary.province} untuk{" "}
            {summary.season}, dihitung dari citra <em>Sentinel-2</em>, agregasi cuaca harian,
            dan data historis BPS — tiga bulan sebelum panen aktual.
          </p>
          <div className="space-y-2 border-l border-rule pl-5 font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint animate-fade-in">
            <div className="flex justify-between">
              <span>Sumber Citra</span>
              <span className="text-ink">Sentinel-2 L2A · 10 m</span>
            </div>
            <div className="flex justify-between">
              <span>Frekuensi</span>
              <span className="text-ink">5 hari</span>
            </div>
            <div className="flex justify-between">
              <span>Model</span>
              <span className="text-ink">XGBoost · time-split</span>
            </div>
            <div className="flex justify-between">
              <span>Validasi</span>
              <span className="text-ink">BPS MT 2023 — backtest</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────── KPI STRIP ─────── */}
      <section>
        <div className="rule-h" />
        <div className="mt-4 mb-2 meta-row">
          <span>§ 01.1 — Indikator Utama</span>
        </div>
        <div className="grid divide-y divide-rule sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {summary.tiles.map((t, i) => (
            <KpiCard
              key={t.label}
              label={t.label}
              value={t.value}
              delta={t.delta}
              positive={t.positive}
              index={i}
            />
          ))}
        </div>
      </section>

      {/* ─────── TREND + EDITORIAL NOTE ─────── */}
      <section>
        <SectionRule
          numeral="01.2"
          eyebrow="Tren Produksi"
          title="Tujuh tahun padi"
          caption="Aktual BPS 2018–2023, prediksi 2024 ditampilkan terputus."
        />
        <div className="mt-7 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Card className="animate-ink-rise stagger-3">
            <CardHeader>
              <CardTitle>Produksi {trend.commodity} {trend.province}</CardTitle>
              <CardDescription>Unit · {trend.unit}</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart trend={trend} />
            </CardContent>
          </Card>

          <Card className="animate-ink-rise stagger-4">
            <CardHeader>
              <CardTitle>Catatan Redaksi</CardTitle>
              <CardDescription>Day 1 · Dummy Data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 font-display text-[15px] leading-relaxed text-ink-soft">
              <p>
                Dashboard ini memuat data dummy dari endpoint{" "}
                <code className="rounded-sm bg-paper-edge px-1 py-0.5 font-mono text-[12px] text-ink">
                  /api/dashboard/summary
                </code>
                . Endpoint akan diganti dengan output{" "}
                <em>model/predict.py</em> pada Day 2 setelah pipeline GEE + BPS jalan.
              </p>
              <p className="border-t border-rule pt-3">
                Day 3: bind ke peta choropleth dan tambah filter komoditas, musim tanam, serta
                ekspor PDF buletin per pekan.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ─────── PULL-QUOTE / IMPACT ─────── */}
      <section className="relative overflow-hidden border border-ink/20 bg-ink px-8 py-12 text-paper md:px-14">
        <div className="absolute right-6 top-4 font-mono text-[10px] uppercase tracking-smallcaps text-paper/50">
          § 01.3 · Pernyataan Dampak
        </div>
        <blockquote
          className="max-w-4xl font-display italic leading-[1.05] text-paper"
          style={{
            fontSize: "clamp(1.6rem, 2.5vw + 0.8rem, 3rem)",
            fontVariationSettings: '"opsz" 96, "SOFT" 50',
          }}
        >
          “Indonesia mengimpor beras, jagung, dan kedelai setiap tahun meski berpotensi
          swasembada — jika logistik dan timing-nya tepat. Salah prediksi pangan merugikan
          triliunan rupiah per tahun.”
        </blockquote>
        <div className="mt-7 flex flex-wrap items-center gap-6 font-mono text-[10px] uppercase tracking-smallcaps text-paper/55">
          <span className="h-px w-12 bg-paper/50" />
          <span>Latar belakang PanenCerdas · UNITY № 14 UNY 2026</span>
        </div>
      </section>
    </div>
  );
}
