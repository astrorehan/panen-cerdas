import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";
import { api } from "@/lib/api";
import { TrendChart } from "@/components/trend-chart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [summary, trend] = await Promise.all([
    api.dashboard.summary().catch(() => null),
    api.dashboard.trend().catch(() => null),
  ]);

  if (!summary || !trend) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center">
        <h2 className="text-lg font-semibold">Backend tidak terhubung</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pastikan FastAPI backend jalan di{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">localhost:8000</code>.<br />
          Jalankan{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">uvicorn backend.main:app --reload</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 p-7 text-white shadow-lg">
        <div className="text-sm uppercase tracking-wide text-brand-100">
          {summary.province} - {summary.season}
        </div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">PanenCerdas Dashboard</h1>
        <p className="mt-2 max-w-2xl text-brand-100">
          Prediksi hasil panen padi berbasis citra satelit Sentinel-2, data cuaca, dan
          historical yield BPS. Update sebelum 3 bulan masa panen.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.tiles.map((t) => (
          <KpiCard key={t.label} label={t.label} value={t.value} delta={t.delta} positive={t.positive} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Tren Produksi Padi - {trend.province}</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart trend={trend} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Catatan Day 1</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Dashboard ini saat ini pakai data dummy dari endpoint{" "}
              <code className="rounded bg-muted px-1 py-0.5">/api/dashboard/summary</code>.
            </p>
            <p>
              Day 2: ganti dummy dengan output{" "}
              <code className="rounded bg-muted px-1 py-0.5">model/predict.py</code> setelah
              pipeline GEE + BPS jalan.
            </p>
            <p>
              Day 3: tambah filter komoditas dan musim tanam, bind ke choropleth di halaman Peta.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
