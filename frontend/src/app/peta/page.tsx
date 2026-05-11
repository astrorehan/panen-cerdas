import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { MapPanel } from "./map-panel";

export const dynamic = "force-dynamic";

export default async function PetaPage() {
  const [predictions, geojson] = await Promise.all([
    api.predictions.list().catch(() => null),
    api.regions.geojson().catch(() => null),
  ]);

  if (!predictions || !geojson) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center">
        Backend tidak terhubung. Jalankan{" "}
        <code className="rounded bg-muted px-1.5 py-0.5">uvicorn backend.main:app --reload</code>.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Peta Prediksi Surplus / Defisit</h1>
        <p className="text-sm text-muted-foreground">
          {predictions.province} - {predictions.season} - komoditas {predictions.commodity}. Klik
          kecamatan untuk drill-down.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Choropleth Status Pangan per Kecamatan</CardTitle>
        </CardHeader>
        <CardContent>
          <MapPanel geojson={geojson} predictions={predictions.items} />
        </CardContent>
      </Card>
    </div>
  );
}
