"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, BarChart3, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SkeletonLoader } from "@/components/skeleton-loader";
import { api, apiPath } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { formatNumber, STATUS_COLOR, STATUS_LABEL } from "@/lib/utils";
import { NdviChart } from "./ndvi-chart";
import { BacktestChart } from "./backtest-chart";
import { KecamatanSelect } from "./select";
import type { CropType } from "@/types";
import { getUserProvince } from "@/lib/auth";
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

const COMMODITY_MAP: Record<string, string> = {
  padi: "Padi",
  jagung: "Jagung",
  kedelai: "Kedelai",
  ubi_jalar: "Ubi Jalar",
  ubi_kayu: "Singkong",
  cabe_besar: "Cabe Besar",
  cabe_rawit: "Cabe Rawit",
  bawang_merah: "Bawang Merah",
  bawang_putih: "Bawang Putih",
};

const PROV_CODE_MAP: Record<string, string> = {
  "Aceh": "PROV_11",
  "Sumatera Utara": "PROV_12",
  "Sumatera Barat": "PROV_13",
  "Riau": "PROV_14",
  "Jambi": "PROV_15",
  "Sumatera Selatan": "PROV_16",
  "Bengkulu": "PROV_17",
  "Lampung": "PROV_18",
  "Kepulauan Bangka Belitung": "PROV_19",
  "Bangka Belitung": "PROV_19",
  "Kepulauan Riau": "PROV_21",
  "DKI Jakarta": "PROV_31",
  "Jawa Barat": "PROV_32",
  "Jawa Tengah": "PROV_33",
  "DI Yogyakarta": "PROV_34",
  "Jawa Timur": "PROV_35",
  "Banten": "PROV_36",
  "Bali": "PROV_51",
  "Nusa Tenggara Barat": "PROV_52",
  "Nusa Tenggara Timur": "PROV_53",
  "Kalimantan Barat": "PROV_61",
  "Kalimantan Tengah": "PROV_62",
  "Kalimantan Selatan": "PROV_63",
  "Kalimantan Timur": "PROV_64",
  "Kalimantan Utara": "PROV_65",
  "Sulawesi Utara": "PROV_71",
  "Gorontalo": "PROV_75",
  "Sulawesi Tengah": "PROV_72",
  "Sulawesi Barat": "PROV_76",
  "Sulawesi Selatan": "PROV_73",
  "Sulawesi Tenggara": "PROV_74",
  "Maluku": "PROV_81",
  "Maluku Utara": "PROV_82",
  "Papua Barat": "PROV_91",
  "Papua": "PROV_94",
  "Papua Selatan": "PROV_93",
  "Papua Tengah": "PROV_94",
  "Papua Pegunungan": "PROV_95",
  "Papua Barat Daya": "PROV_96",
  "ALL": "PROV_34",
};

export default function DetailPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-12">
          <SkeletonLoader label="Memuat data kecamatan..." />
        </div>
      }
    >
      <DetailPageInner />
    </Suspense>
  );
}

function DetailPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id") ?? undefined;
  const commodityParam = (searchParams.get("commodity") as CropType) ?? "padi";

  const defaultProv = getUserProvince();
  const defaultId = defaultProv === "DI Yogyakarta"
    ? undefined
    : (PROV_CODE_MAP[defaultProv] ?? "PROV_34");

  const tempId = queryId ?? defaultId;
  const isProvinceLevel = (tempId ?? "").startsWith("PROV_");

  // Mode kecamatan (DIY): muat 7 kecamatan (paralel, cepat) untuk dropdown.
  const listProvinceName = defaultProv === "ALL" ? "DI Yogyakarta" : defaultProv;
  const { data: kecList, loading: loadingKec } = useApi(
    isProvinceLevel ? null : apiPath.predictionsList(listProvinceName, commodityParam),
    () => api.predictions.list(listProvinceName, commodityParam),
  );

  // Mode provinsi: cukup direktori provinsi yang ringan untuk dropdown. Kita
  // TIDAK memuat prediksi 37 provinsi sekaligus di sini — itu berat (~20-25s)
  // dan kena timeout gateway. Konten provinsi diambil dari endpoint detail
  // satu provinsi di bawah (1 fetch, cepat).
  const { data: provDir } = useApi(
    isProvinceLevel ? apiPath.regionsProvinces() : null,
    () => api.regions.provinces(),
  );

  const selectedId = tempId ?? kecList?.items[0]?.id;

  const { data: detail, loading: loadingDetail } = useApi(
    selectedId ? apiPath.predictionsDetail(selectedId, commodityParam) : null,
    () => api.predictions.detail(selectedId as string, commodityParam),
  );

  const options = isProvinceLevel
    ? (provDir?.items ?? []).map((p) => ({ id: p.id, kabupaten: p.name }))
    : (kecList?.items ?? []);

  const provinceLabel = isProvinceLevel
    ? "Indonesia"
    : kecList?.province ?? "DI Yogyakarta";

  // Loading awal: belum ada apa pun untuk ditampilkan.
  const initialLoading = isProvinceLevel
    ? !detail && loadingDetail
    : loadingKec && !kecList;
  if (initialLoading) {
    return (
      <div className="container py-12">
        <SkeletonLoader label="Memuat data wilayah..." />
      </div>
    );
  }

  // Backend mati: mode kecamatan tak dapat daftar, mode provinsi tak dapat detail.
  const backendDown = isProvinceLevel
    ? !loadingDetail && !detail
    : !loadingKec && !kecList;
  if (backendDown) {
    return (
      <div className="container py-12">
        <div className="mx-auto max-w-md rounded-3xl border border-destructive/30 bg-destructive/8 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-xl font-semibold tracking-tight">
            Backend tidak terhubung
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container space-y-8 py-8 md:py-12">
      <header>
        <div className="eyebrow">
          <BarChart3 className="h-3 w-3" />
          Profil Analisis Wilayah
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Bedah Wilayah &amp; Komoditas
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Analisis komoditas <span className="font-semibold text-foreground">{COMMODITY_MAP[commodityParam] || "Padi"}</span> untuk memantau time series NDVI, prediksi yield, dan backtest historis terhadap data resmi Kementan.
        </p>
      </header>

      <Card className="flex flex-wrap items-end justify-between gap-4 p-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <MapPin className="h-3 w-3" />
            Subjek analisis · Komoditas {COMMODITY_MAP[commodityParam] || "Padi"}
          </div>
          {isProvinceLevel ? (
            <>
              <div className="mt-1 text-2xl font-semibold tracking-tight">
                {detail?.kabupaten ?? "-"}
              </div>
              <div className="mt-0.5 text-sm text-muted-foreground">
                Provinsi · Komoditas {COMMODITY_MAP[commodityParam] || "Padi"}
              </div>
            </>
          ) : (
            <>
              <div className="mt-1 text-2xl font-semibold tracking-tight">
                {detail?.kecamatan ?? "-"}
              </div>
              <div className="mt-0.5 text-sm text-muted-foreground">
                Kab. {detail?.kabupaten ?? "-"} - {provinceLabel} · Komoditas {COMMODITY_MAP[commodityParam] || "Padi"}
              </div>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <KecamatanSelect
            options={options}
            currentId={selectedId}
            mode={isProvinceLevel ? "province" : "kecamatan"}
            commodity={commodityParam}
          />
          <CustomSelect
            id="comm-select"
            label="Komoditas"
            value={commodityParam}
            onChange={(e) => router.push(`/pemerintah/analisis?id=${selectedId || ""}&commodity=${e.target.value}`)}
            wrapperClassName="min-w-[180px]"
          >
            {COMMODITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </CustomSelect>
        </div>
      </Card>

      {!detail ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Memuat detail wilayah untuk komoditas {COMMODITY_MAP[commodityParam] || "Padi"}...
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Numeral
              label={`Yield Prediksi ${COMMODITY_MAP[commodityParam] || "Padi"}`}
              numeral={detail.yield_pred_ton_per_ha.toFixed(2)}
              unit="ton/ha"
            />
            <Numeral
              label="Luas Panen"
              numeral={formatNumber(detail.luas_panen_ha)}
              unit="hektar"
            />
            <Numeral
              label={`Total Produksi ${COMMODITY_MAP[commodityParam] || "Padi"}`}
              numeral={formatNumber(detail.total_produksi_ton)}
              unit="ton"
              accent
            />
          </div>

          {detail.status && detail.surplus_pct != null && (
            <div
              className="flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-border bg-surface shadow-card"
              style={{
                borderLeftColor: STATUS_COLOR[detail.status],
                borderLeftWidth: 5,
              }}
            >
              <div className="px-5 py-4">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Status Pangan ({COMMODITY_MAP[commodityParam] || "Padi"})
                </div>
                <div
                  className="mt-1 text-2xl font-semibold tracking-tight"
                  style={{ color: STATUS_COLOR[detail.status] }}
                >
                  {STATUS_LABEL[detail.status]}
                </div>
              </div>
              <div className="px-5 py-4 text-right text-xs text-muted-foreground">
                <div>
                  Surplus / Defisit ·{" "}
                  <span className="font-semibold text-foreground">
                    {detail.surplus_pct > 0 ? "+" : ""}
                    {detail.surplus_pct.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1">
                  Threshold · surplus &gt; +10 · defisit &lt; -10
                </div>
              </div>
            </div>
          )}

          {detail.feedback_count && detail.feedback_count > 0 && detail.yield_actual_ton_per_ha != null ? (
            <Card className="border-primary/25 bg-primary/[0.04]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Laporan Panen {COMMODITY_MAP[commodityParam] || "Padi"} Petani
                </CardTitle>
                <CardDescription>
                  Yield aktual ground-truth dari{" "}
                  <span className="font-medium text-foreground">
                    {detail.feedback_count} laporan
                  </span>{" "}
                  petani untuk komoditas <span className="font-semibold text-foreground">{COMMODITY_MAP[commodityParam] || "Padi"}</span> di kecamatan ini — diperbarui otomatis setiap ada laporan baru.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Numeral
                    label="Yield Aktual (petani)"
                    numeral={detail.yield_actual_ton_per_ha.toFixed(2)}
                    unit="ton/ha"
                    accent
                  />
                  <Numeral
                    label="Yield Prediksi (model)"
                    numeral={detail.yield_pred_ton_per_ha.toFixed(2)}
                    unit="ton/ha"
                  />
                  <Numeral
                    label="Selisih Aktual - Prediksi"
                    numeral={`${
                      detail.yield_actual_ton_per_ha - detail.yield_pred_ton_per_ha >= 0 ? "+" : ""
                    }${(detail.yield_actual_ton_per_ha - detail.yield_pred_ton_per_ha).toFixed(2)}`}
                    unit="ton/ha"
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed p-5 text-sm text-muted-foreground">
              Belum ada laporan panen petani untuk komoditas <span className="font-semibold text-foreground">{COMMODITY_MAP[commodityParam] || "Padi"}</span> di kecamatan ini. Angka di atas
              murni prediksi model — akan otomatis diperbarui saat petani mengirim
              hasil panen lewat fitur feedback.
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>NDVI Time Series ({COMMODITY_MAP[commodityParam] || "Padi"})</CardTitle>
              <CardDescription>
                {detail.ndvi_source === "modis_appeears" ? (
                  <>
                    MODIS MOD13Q1 (16 hari, 250 m) dari NASA APPEEARS —
                    {" "}
                    <span className="font-medium text-foreground">
                      {detail.ndvi_series.length} composite real
                    </span>{" "}
                    untuk komoditas {COMMODITY_MAP[commodityParam] || "Padi"} di titik koordinat ini, 2018–2025.
                  </>
                ) : (
                  <>
                    Data satelit NDVI historis per koordinat untuk komoditas {COMMODITY_MAP[commodityParam] || "Padi"} (2018–2025 bulanan).
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NdviChart series={detail.ndvi_series} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Backtest - Prediksi vs Aktual ({COMMODITY_MAP[commodityParam] || "Padi"})</CardTitle>
              <CardDescription>
                Validasi model RandomForest terhadap data Kementan tahun sebelumnya untuk komoditas {COMMODITY_MAP[commodityParam] || "Padi"}
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
  accent,
}: {
  label: string;
  numeral: string;
  unit: string;
  accent?: boolean;
}) {
  return (
    <Card
      className={`p-5 ${
        accent
          ? "border-primary/25 bg-gradient-to-br from-primary to-primary-deep text-primary-foreground"
          : ""
      }`}
    >
      <div
        className={`text-xs font-medium uppercase tracking-wider ${
          accent ? "text-primary-foreground/80" : "text-muted-foreground"
        }`}
      >
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tracking-tight md:text-4xl">
          {numeral}
        </span>
        <span
          className={`text-sm ${
            accent ? "text-primary-foreground/80" : "text-muted-foreground"
          }`}
        >
          {unit}
        </span>
      </div>
    </Card>
  );
}
