import { AlertCircle, Database, Satellite, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";
import { TrendChart } from "@/components/trend-chart";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function PemerintahDashboardPage() {
  const [summary, trend] = await Promise.all([
    api.dashboard.summary().catch(() => null),
    api.dashboard.trend().catch(() => null),
  ]);

  if (!summary || !trend) {
    return (
      <div className="container py-12">
        <div className="mx-auto max-w-md rounded-3xl border border-destructive/30 bg-destructive/8 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-xl font-semibold tracking-tight">
            Backend tidak terhubung
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Jalankan{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              uvicorn ml_service.main:app --reload --port 8000
            </code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container space-y-10 py-8 md:py-12">
      {/* Hero */}
      <section className="rounded-3xl border border-border bg-gradient-to-br from-primary-soft via-surface to-amber/10 p-7 md:p-10">
        <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="eyebrow">
              <Sparkles className="h-3 w-3" />
              Dashboard Eksekutif
            </div>
            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-balance md:text-5xl">
              Memetakan panen <span className="text-primary">sebelum panen</span>.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Buletin ini meringkas prediksi hasil panen padi {summary.province} untuk{" "}
              {summary.season}, dihitung dari citra Sentinel-2, agregasi cuaca harian,
              dan data historis Kementan - tiga bulan sebelum panen aktual.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Sumber & Validasi
            </div>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <Satellite className="h-3.5 w-3.5" />
                  Citra
                </dt>
                <dd className="text-right font-medium">Sentinel-2 L2A - 10 m</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Frekuensi</dt>
                <dd className="font-medium">5 hari</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Model</dt>
                <dd className="font-medium">RandomForest - ensemble</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <Database className="h-3.5 w-3.5" />
                  Validasi
                </dt>
                <dd className="text-right font-medium">Kementan MT 2023</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* KPI strip */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Indikator Utama</h2>
          <span className="text-xs text-muted-foreground">
            {summary.tiles.length} metrik
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Trend */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Tren Produksi</h2>
          <span className="text-xs text-muted-foreground">
            Sumber Kementan - aktual 2020-2024, proyeksi tahun berjalan
          </span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>
              Produksi {trend.commodity} {trend.province}
            </CardTitle>
            <CardDescription>Unit - {trend.unit}</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart trend={trend} />
          </CardContent>
        </Card>
      </section>

      {/* Impact statement */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary-deep px-7 py-12 text-primary-foreground md:px-14 md:py-16">
        <div className="absolute inset-0 bg-grid-dot opacity-10" />
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber/20 blur-3xl" />
        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            Pernyataan Dampak
          </div>
          <blockquote className="mt-5 text-2xl font-medium leading-tight tracking-tight text-balance md:text-4xl">
            &ldquo;Indonesia mengimpor beras, jagung, dan kedelai setiap tahun
            meski berpotensi swasembada - jika logistik dan timing-nya tepat.
            Salah prediksi pangan merugikan triliunan rupiah per tahun.&rdquo;
          </blockquote>
          <div className="mt-7 text-xs font-medium uppercase tracking-wider text-primary-foreground/70">
            Latar belakang Panen Cerdas
          </div>
        </div>
      </section>
    </div>
  );
}
