"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Map as MapIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SkeletonLoader } from "@/components/skeleton-loader";
import { api } from "@/lib/api";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/utils";
import { MapPanel } from "./map-panel";
import type {
  CropType,
  GeoJsonFC,
  PredictionsResponse,
  Province,
  StatusPangan,
} from "@/types";

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

const NATIONAL: Province = {
  id:      "ALL",
  code:    "00",
  name:    "Indonesia (37 provinsi)",
  capital: "—",
  region:  "Nasional",
  lat:     -2.5,
  lon:     117.5,
};

export default function PetaPage() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [provinceKey, setProvinceKey] = useState<string>("DI Yogyakarta");
  const [commodity, setCommodity]     = useState<CropType>("padi");

  const [predictions, setPredictions] = useState<PredictionsResponse | null>(null);
  const [geojson, setGeojson]         = useState<GeoJsonFC | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // Load provinces list sekali di mount
  useEffect(() => {
    api.regions.provinces()
      .then((r) => setProvinces([NATIONAL, ...r.items]))
      .catch(() => setProvinces([NATIONAL]));
  }, []);

  // Load predictions + geojson tiap provinceKey/commodity berubah
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const province = provinceKey === "ALL" ? "ALL" : provinceKey;

    Promise.all([
      api.predictions.list(province, commodity),
      api.regions.geojson(province),
    ])
      .then(([preds, geo]) => {
        if (cancelled) return;
        setPredictions(preds);
        setGeojson(geo);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || "Gagal memuat data");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [provinceKey, commodity]);

  const counts = useMemo(() => {
    const c: Record<StatusPangan, number> = {
      surplus: 0, cukup: 0, waspada: 0, defisit: 0,
    };
    if (predictions) {
      for (const item of predictions.items) {
        c[item.status] = (c[item.status] ?? 0) + 1;
      }
    }
    return c;
  }, [predictions]);

  const isNational = provinceKey === "ALL";

  return (
    <div className="container space-y-8 py-8 md:py-12">
      <header>
        <div className="eyebrow">
          <MapIcon className="h-3 w-3" />
          Atlas Pangan
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Peta surplus dan defisit
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {isNational
            ? "Bubble map 37 provinsi - ukuran sesuai produksi, warna sesuai status pangan. Klik provinsi untuk drill-down."
            : "Choropleth status pangan per kecamatan - klik wilayah untuk drill-down. Mode kecamatan tersedia untuk DI Yogyakarta (pilot)."}
        </p>
      </header>

      {/* Filter bar */}
      <section className="grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="province">Wilayah</Label>
          <select
            id="province"
            value={provinceKey}
            onChange={(e) => setProvinceKey(e.target.value)}
            className="flex h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {provinces.map((p) => (
              <option
                key={p.id}
                value={p.id === "ALL" ? "ALL" : p.name}
              >
                {p.name}
                {p.region !== "Nasional" ? ` (${p.region})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="commodity">Komoditas</Label>
          <select
            id="commodity"
            value={commodity}
            onChange={(e) => setCommodity(e.target.value as CropType)}
            className="flex h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {COMMODITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {loading && <SkeletonLoader label="Memuat peta..." />}

      {error && !loading && (
        <div className="mx-auto max-w-md rounded-3xl border border-destructive/30 bg-destructive/8 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-xl font-semibold tracking-tight">
            Backend tidak terhubung
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      )}

      {predictions && geojson && !loading && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>{predictions.province}</CardTitle>
                <CardDescription>
                  Komoditas {predictions.commodity} - {predictions.season}
                </CardDescription>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div className="font-medium text-foreground">
                  {predictions.items.length}{" "}
                  {isNational ? "provinsi" : "kecamatan"}
                </div>
                <div className="mt-0.5">
                  {isNational ? "scale ~ 1 : 30 jt" : "scale ~ 1 : 800.000"}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border-t border-border">
                <MapPanel
                  geojson={geojson}
                  predictions={predictions.items}
                  national={isNational}
                />
              </div>
            </CardContent>
          </Card>

          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Legenda
                </div>
                <CardTitle className="mt-1 text-lg">Status Pangan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 pb-5">
                {(["surplus", "cukup", "waspada", "defisit"] as const).map((s) => (
                  <div
                    key={s}
                    className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className="inline-block h-4 w-4 rounded-md ring-1 ring-border"
                        style={{ backgroundColor: STATUS_COLOR[s] }}
                      />
                      <span className="font-medium text-foreground">
                        {STATUS_LABEL[s]}
                      </span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {counts[s] ?? 0}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Catatan
                </div>
                <CardTitle className="mt-1 text-lg">Ambang status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Surplus &gt; +10% - Defisit &lt; -10%</p>
                <p>
                  {isNational
                    ? "Mode nasional menampilkan 37 provinsi sebagai bubble di centroid administratif. Surplus dihitung vs rata-rata yield BPS 3 tahun terakhir per provinsi."
                    : "Mode DI Yogyakarta menampilkan 7 kecamatan pilot dengan polygon real. Provinsi lain belum punya batas kecamatan, pilih 'Indonesia' untuk view nasional."}
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}
