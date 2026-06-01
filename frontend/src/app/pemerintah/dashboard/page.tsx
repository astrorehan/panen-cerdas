"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Database, Satellite, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import dynamic from "next/dynamic";
import { KpiCard } from "@/components/kpi-card";
// Recharts is heavy; load it on demand so it stays out of the initial bundle.
const TrendChart = dynamic(
  () => import("@/components/trend-chart").then((m) => m.TrendChart),
  { ssr: false, loading: () => <div className="h-72 w-full" /> },
);
import { SkeletonLoader, KpiSkeleton, ChartSkeleton } from "@/components/skeleton-loader";
import { api, apiPath } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { getUserProvince } from "@/lib/auth";
import type { CropType, Province } from "@/types";
import { CustomSelect } from "@/components/ui/select-custom";

const COMMODITIES: Array<{ id: CropType; label: string }> = [
  { id: "padi",         label: "Padi" },
  { id: "jagung",       label: "Jagung" },
  { id: "kedelai",      label: "Kedelai" },
  { id: "ubi_jalar",    label: "Ubi Jalar" },
  { id: "ubi_kayu",     label: "Singkong" },
  { id: "cabe_besar",   label: "Cabe Besar" },
  { id: "cabe_rawit",   label: "Cabe Rawit" },
  { id: "bawang_merah", label: "Bawang Merah" },
  { id: "bawang_putih", label: "Bawang Putih" },
];

export default function PemerintahDashboardPage() {
  const defaultProv = getUserProvince();
  const [provinceKey, setProvinceKey] = useState<string>(() =>
    defaultProv === "ALL" ? "DI Yogyakarta" : defaultProv
  );
  const [commodity, setCommodity]     = useState<CropType>("padi");

  const { data: provincesRes } = useApi(
    apiPath.regionsProvinces(),
    () => api.regions.provinces(),
  );

  const provinces = useMemo<Province[]>(
    () => provincesRes?.items ?? [],
    [provincesRes],
  );

  const { data: summary, loading: loadingSummary } = useApi(
    apiPath.dashboardSummary(provinceKey, commodity),
    () => api.dashboard.summary(provinceKey, commodity),
  );

  const { data: trend, loading: loadingTrend } = useApi(
    apiPath.dashboardTrend(provinceKey, commodity),
    () => api.dashboard.trend(provinceKey, commodity),
  );

  const loading = loadingSummary || loadingTrend;

  const activeCommodityLabel = useMemo(() => {
    return COMMODITIES.find((c) => c.id === commodity)?.label ?? "Padi";
  }, [commodity]);

  const provinceOptions = useMemo(() => {
    return provinces.map((p) => ({
      value: p.name,
      label: p.name + (p.region !== "Nasional" ? ` (${p.region})` : ""),
    }));
  }, [provinces]);

  const commodityOptions = useMemo(() => {
    return COMMODITIES.map((c) => ({
      value: c.id,
      label: c.label,
    }));
  }, []);

  if (!loading && (!summary || !trend)) {
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
    <div className="container space-y-8 py-8 md:py-12">
      {/* Hero */}
      <section className="rounded-3xl border border-border bg-gradient-to-br from-primary-soft via-surface to-amber/10 p-7 md:p-10">
        <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="eyebrow">
              <Sparkles className="h-3 w-3" />
              Dashboard Eksekutif · {summary?.province || provinceKey}
            </div>
            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-balance md:text-5xl">
              Memetakan panen <span className="text-primary">sebelum panen</span>.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Meringkas prediksi hasil panen komoditas <span className="font-semibold text-foreground">{activeCommodityLabel}</span> di {summary?.province || provinceKey} untuk{" "}
              {summary?.season || "Musim ini"}, dihitung dari citra satelit, agregasi cuaca harian,
              dan data historis Kementan — tiga bulan sebelum panen aktual.
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
                <dd className="text-right font-medium">MODIS & Sentinel-2</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Iklim & Cuaca</dt>
                <dd className="font-medium">NASA POWER API</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Model ML</dt>
                <dd className="font-medium">RandomForest Ensemble</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <Database className="h-3.5 w-3.5" />
                  Validasi
                </dt>
                <dd className="text-right font-medium">Data Historis Kementan</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Filter bar */}
      <section className="relative z-20 grid gap-4 rounded-3xl border border-border bg-surface/40 p-4 shadow-card sm:grid-cols-2 backdrop-blur-sm">
        <CustomSelect
          id="province"
          label="Wilayah Pemantauan"
          value={provinceKey}
          onChange={(val) => setProvinceKey(val)}
          options={provinceOptions}
        />

        <CustomSelect
          id="commodity"
          label="Komoditas"
          value={commodity}
          onChange={(val) => setCommodity(val as CropType)}
          options={commodityOptions}
        />
      </section>

      {/* KPI strip */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Indikator Utama</h2>
          <span className="text-xs text-muted-foreground">
            {loading ? "Memuat..." : `${summary?.tiles?.length ?? 0} metrik aktif`}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {loading || !summary ? (
            <>
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
            </>
          ) : (
            summary.tiles.map((t, i) => (
              <KpiCard
                key={t.label}
                label={t.label}
                value={t.value}
                delta={t.delta}
                positive={t.positive}
                index={i}
              />
            ))
          )}
        </div>
      </section>

      {/* Trend */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Tren Produksi Historis</h2>
          <span className="text-xs text-muted-foreground">
            Sumber Kementan — aktual historis + proyeksi model tahun berikutnya
          </span>
        </div>
        {loading || !trend ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                Produksi {activeCommodityLabel} {trend.province}
              </CardTitle>
              <CardDescription>Satuan unit: {trend.unit}</CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <TrendChart trend={trend} />
            </CardContent>
          </Card>
        )}
      </section>

      {/* Impact statement */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary-deep px-7 py-12 text-primary-foreground md:px-14 md:py-16">
        <div className="absolute inset-0 bg-grid-dot opacity-10" />
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber/20 blur-3xl" />
        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            Pernyataan Dampak Swasembada
          </div>
          <blockquote className="mt-5 text-2xl font-medium leading-tight tracking-tight text-balance md:text-4xl">
            &ldquo;Indonesia mengimpor beras, jagung, dan kedelai setiap tahun
            meski berpotensi swasembada — jika logistik dan timing-nya tepat.
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
