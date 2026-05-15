import { AlertCircle, BarChart3, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  const selectedId = id ?? list.items[0]?.id;
  const detail = selectedId ? await api.predictions.detail(selectedId).catch(() => null) : null;
  const selectedPred = list.items.find((it) => it.id === selectedId);

  return (
    <div className="container space-y-8 py-8 md:py-12">
      <header>
        <div className="eyebrow">
          <BarChart3 className="h-3 w-3" />
          Profil Kecamatan
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Bedah satu kecamatan
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Time series NDVI, prediksi yield, dan backtest historis terhadap
          data resmi Kementan.
        </p>
      </header>

      <Card className="flex flex-wrap items-end justify-between gap-4 p-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <MapPin className="h-3 w-3" />
            Subjek analisis
          </div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">
            {detail?.kecamatan ?? "-"}
          </div>
          <div className="mt-0.5 text-sm text-muted-foreground">
            Kab. {detail?.kabupaten ?? "-"} - {list.province}
          </div>
        </div>
        <KecamatanSelect options={list.items} currentId={selectedId} />
      </Card>

      {!detail ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Pilih kecamatan untuk memuat detail.
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Numeral
              label="Yield Prediksi"
              numeral={detail.yield_pred_ton_per_ha.toFixed(2)}
              unit="ton/ha"
            />
            <Numeral
              label="Luas Panen"
              numeral={formatNumber(detail.luas_panen_ha)}
              unit="hektar"
            />
            <Numeral
              label="Total Produksi"
              numeral={formatNumber(detail.total_produksi_ton)}
              unit="ton"
              accent
            />
          </div>

          {selectedPred && (
            <div
              className="flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-border bg-surface shadow-card"
              style={{
                borderLeftColor: STATUS_COLOR[selectedPred.status],
                borderLeftWidth: 5,
              }}
            >
              <div className="px-5 py-4">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Status Pangan
                </div>
                <div
                  className="mt-1 text-2xl font-semibold tracking-tight"
                  style={{ color: STATUS_COLOR[selectedPred.status] }}
                >
                  {STATUS_LABEL[selectedPred.status]}
                </div>
              </div>
              <div className="px-5 py-4 text-right text-xs text-muted-foreground">
                <div>
                  Surplus / Defisit ·{" "}
                  <span className="font-semibold text-foreground">
                    {selectedPred.surplus_pct > 0 ? "+" : ""}
                    {selectedPred.surplus_pct.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1">
                  Threshold · surplus &gt; +10 · defisit &lt; -10
                </div>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>NDVI Time Series</CardTitle>
              <CardDescription>
                {detail.ndvi_source === "modis_appeears" ? (
                  <>
                    MODIS MOD13Q1 (16 hari, 250 m) dari NASA APPEEARS —
                    {" "}
                    <span className="font-medium text-foreground">
                      {detail.ndvi_series.length} composite real
                    </span>{" "}
                    untuk titik koordinat ini, 2018–2025.
                  </>
                ) : (
                  <>
                    Data satelit NDVI historis per koordinat (2018–2025 bulanan).
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
              <CardTitle>Backtest - Prediksi vs Aktual</CardTitle>
              <CardDescription>
                Validasi model RandomForest terhadap data Kementan tahun sebelumnya
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
