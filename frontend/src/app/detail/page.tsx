import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
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
      <div className="rounded-xl border bg-white p-8 text-center">
        Backend tidak terhubung. Jalankan{" "}
        <code className="rounded bg-muted px-1.5 py-0.5">uvicorn backend.main:app --reload</code>.
      </div>
    );
  }

  const selectedId = id ?? list.items[0]?.id;
  const detail = selectedId ? await api.predictions.detail(selectedId).catch(() => null) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Detail Kecamatan</h1>
          <p className="text-sm text-muted-foreground">
            Drill-down NDVI time series, prediksi yield, dan backtest historis.
          </p>
        </div>
        <KecamatanSelect options={list.items} currentId={selectedId} />
      </div>

      {!detail ? (
        <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground">
          Pilih kecamatan di atas.
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <div className="text-xs uppercase text-muted-foreground">Yield Prediksi</div>
                <div className="mt-2 text-3xl font-bold">{detail.yield_pred_ton_per_ha.toFixed(2)} ton/ha</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-xs uppercase text-muted-foreground">Luas Panen</div>
                <div className="mt-2 text-3xl font-bold">{formatNumber(detail.luas_panen_ha)} ha</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-xs uppercase text-muted-foreground">Total Produksi</div>
                <div className="mt-2 text-3xl font-bold">{formatNumber(detail.total_produksi_ton)} ton</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>NDVI Time Series</CardTitle>
            </CardHeader>
            <CardContent>
              <NdviChart series={detail.ndvi_series} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Backtest - Prediksi vs Aktual</CardTitle>
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
