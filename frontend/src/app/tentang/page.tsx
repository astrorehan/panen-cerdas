import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TentangPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Tentang PanenCerdas</h1>
        <p className="mt-2 text-muted-foreground">
          Platform prediksi hasil panen nasional berbasis citra satelit + AI. UNITY Competition
          #14 UNY 2026.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Masalah yang Dipecahkan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed text-foreground/80">
          <p>
            Data panen dikumpulkan manual oleh penyuluh - lambat, bias, rawan manipulasi.
            Prediksi level provinsi tidak actionable bagi petani. Keputusan impor/ekspor selalu
            terlambat, harga jatuh saat panen raya.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metodologi MVP (Day 1-4)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed text-foreground/80">
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>Ekstraksi NDVI Sentinel-2 per kecamatan per bulan via Google Earth Engine</li>
            <li>Aggregasi data cuaca (ERA5 / BMKG) ke level bulanan</li>
            <li>Feature engineering: lag NDVI T-3 / T-2 / T-1, curah hujan kumulatif, lag yield</li>
            <li>Training XGBoost dengan split berbasis tahun (no random split)</li>
            <li>Prediksi yield per kecamatan + konversi surplus / defisit per kabupaten</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roadmap Pengembangan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed text-foreground/80">
          <ul className="space-y-1.5">
            <li>
              <span className="inline-block h-2.5 w-2.5 translate-y-[-1px] rounded-full bg-brand-700" />{" "}
              Day 1: Foundation, scaffold, dummy demo
            </li>
            <li>
              <span className="inline-block h-2.5 w-2.5 translate-y-[-1px] rounded-full bg-amber-500" />{" "}
              Day 2: Pipeline data + model baseline (XGBoost)
            </li>
            <li>
              <span className="inline-block h-2.5 w-2.5 translate-y-[-1px] rounded-full bg-amber-500" />{" "}
              Day 3: UI polish, choropleth real, surplus/defisit logic
            </li>
            <li>
              <span className="inline-block h-2.5 w-2.5 translate-y-[-1px] rounded-full bg-amber-500" />{" "}
              Day 4: Deploy + pitch + demo video
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tech Stack</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Frontend</div>
              <div>Next.js 14 + Tailwind + shadcn/ui + react-leaflet</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Backend</div>
              <div>FastAPI (Python 3.12)</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">ML</div>
              <div>XGBoost / scikit-learn</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Data</div>
              <div>Sentinel-2 (GEE) + ERA5 / BMKG + BPS</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
