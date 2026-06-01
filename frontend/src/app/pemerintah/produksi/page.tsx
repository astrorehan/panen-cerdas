"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Map as MapIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SkeletonLoader, MapSkeleton } from "@/components/skeleton-loader";
import { api, apiPath } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/utils";
import { MapPanel } from "./map-panel";
import { getUserProvince } from "@/lib/auth";
import type { CropType, Province, StatusPangan } from "@/types";
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
  const [provinceKey, setProvinceKey] = useState<string>(() => getUserProvince());
  const [commodity, setCommodity]     = useState<CropType>("padi");

  const { data: provincesRes } = useApi(
    apiPath.regionsProvinces(),
    () => api.regions.provinces(),
  );
  const provinces = useMemo<Province[]>(
    () => [NATIONAL, ...(provincesRes?.items ?? [])],
    [provincesRes],
  );

  const provinceOptions = useMemo(() => {
    return provinces.map((p) => ({
      value: p.id === "ALL" ? "ALL" : p.name,
      label: p.name + (p.region !== "Nasional" ? ` (${p.region})` : ""),
    }));
  }, [provinces]);

  const commodityOptions = useMemo(() => {
    return COMMODITIES.map((c) => ({
      value: c.id,
      label: c.label,
    }));
  }, []);

  const province = provinceKey === "ALL" ? "ALL" : provinceKey;

  const {
    data: predictions,
    loading: loadingPreds,
    error: errPreds,
  } = useApi(
    apiPath.predictionsList(province, commodity),
    () => api.predictions.list(province, commodity),
  );

  const {
    data: geojson,
    loading: loadingGeo,
    error: errGeo,
  } = useApi(
    apiPath.regionsGeojson(province),
    () => api.regions.geojson(province),
  );

  const loading = loadingPreds || loadingGeo;
  const error = errPreds ?? errGeo;

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

  // Pan map ke provinsi yang dipilih. DIY pakai centroid kecamatan, nasional
  // pakai centroid Indonesia, provinsi lain pakai lat/lon dari Kementan.
  const mapView = useMemo<{ center: [number, number]; zoom: number }>(() => {
    if (isNational) return { center: [-2.5, 117.5], zoom: 5 };
    if (provinceKey === "DI Yogyakarta") return { center: [-7.855, 110.42], zoom: 10 };
    const prov = provinces.find((p) => p.name === provinceKey);
    if (prov) return { center: [prov.lat, prov.lon], zoom: 7 };
    return { center: [-2.5, 117.5], zoom: 5 };
  }, [isNational, provinceKey, provinces]);

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
            ? "Choropleth 37 provinsi - warna sesuai status pangan. Klik provinsi untuk drill-down."
            : "Choropleth status pangan per kecamatan - klik wilayah untuk drill-down. Mode kecamatan tersedia untuk DI Yogyakarta (pilot)."}
        </p>
      </header>

      {/* Filter bar */}
      <section className="relative z-20 grid gap-4 rounded-3xl border border-border bg-surface/40 p-4 shadow-card sm:grid-cols-2 backdrop-blur-sm">
        <CustomSelect
          id="province"
          label="Wilayah"
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

      {!loading && error && (!predictions || !geojson) && (
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

      {loading || !predictions || !geojson ? (
        <MapSkeleton />
      ) : (
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
                  center={mapView.center}
                  zoom={mapView.zoom}
                  viewKey={`${provinceKey}-${predictions.items.length}`}
                  commodity={commodity}
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
                <p className="text-foreground/80">
                  Warna = <strong>prediksi model</strong>, dibandingkan rata-rata
                  panen 3 tahun terakhir wilayah itu <strong>sendiri</strong>.
                  Karena model sudah dikalibrasi per-provinsi, prediksi normal
                  jatuh dekat rata-rata historisnya → mayoritas{" "}
                  <span style={{ color: STATUS_COLOR.cukup }} className="font-medium">
                    Cukup
                  </span>
                  . Waspada/Defisit muncul saat iklim menekan prediksi &gt;10% di
                  bawah normal; Surplus saat &gt;10% di atas.
                </p>
                <p>
                  {isNational
                    ? "Mode nasional mewarnai 34 provinsi dengan polygon batas wilayah real; 3 provinsi Papua baru (belum ada batas) tampil sebagai bubble di centroid."
                    : "Mode DI Yogyakarta menampilkan 7 kecamatan pilot dengan polygon kecamatan. Provinsi lain memakai polygon batas provinsi; pilih 'Indonesia' untuk view nasional."}
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}
