import { AlertCircle, Map as MapIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { api } from "@/lib/api";
import { MapPanel } from "./map-panel";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PetaPage() {
  const [predictions, geojson] = await Promise.all([
    api.predictions.list().catch(() => null),
    api.regions.geojson().catch(() => null),
  ]);

  if (!predictions || !geojson) {
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
            Jalankan uvicorn ml_service.main:app --reload --port 8000
          </p>
        </div>
      </div>
    );
  }

  const counts: Record<string, number> = { surplus: 0, cukup: 0, waspada: 0, defisit: 0 };
  for (const item of predictions.items) counts[item.status] = (counts[item.status] ?? 0) + 1;

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
          Choropleth status pangan per kecamatan - klik wilayah untuk
          drill-down.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>{predictions.province}</CardTitle>
              <CardDescription>
                {predictions.season} - komoditas {predictions.commodity}
              </CardDescription>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div className="font-medium text-foreground">
                {predictions.items.length} kecamatan
              </div>
              <div className="mt-0.5">scale ~ 1 : 800.000</div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t border-border">
              <MapPanel geojson={geojson} predictions={predictions.items} />
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
              <p>
                Surplus &gt; +10% - Defisit &lt; -10%
              </p>
              <p>
                7 polygon mewakili kecamatan Jawa Barat. Versi berikutnya
                memuat batas asli GADM level 3 dan diwarnai oleh output{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
                  model/predict.py
                </code>
                .
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
