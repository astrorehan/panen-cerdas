import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SectionRule } from "@/components/section-rule";
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
      <div className="border border-ink/20 bg-paper-deep p-10 text-center font-display italic text-ink">
        Backend tidak terhubung. Jalankan uvicorn backend.main:app --reload --port 8000
      </div>
    );
  }

  // Summary counts per status for the side rail
  const counts: Record<string, number> = { surplus: 0, cukup: 0, waspada: 0, defisit: 0 };
  for (const item of predictions.items) counts[item.status] = (counts[item.status] ?? 0) + 1;

  return (
    <div className="space-y-10">
      <SectionRule
        numeral="02"
        eyebrow="Atlas Pangan"
        title="Peta Surplus & Defisit"
        caption="Choropleth status pangan per kecamatan — klik wilayah untuk drill-down."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="animate-ink-rise">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>{predictions.province}</CardTitle>
              <CardDescription>
                Lembar Atlas · {predictions.season} · komoditas {predictions.commodity}
              </CardDescription>
            </div>
            <div className="text-right font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
              <div>{predictions.items.length} kecamatan diukur</div>
              <div className="mt-0.5">scale ≈ 1 : 800.000</div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <MapPanel geojson={geojson} predictions={predictions.items} />
          </CardContent>
        </Card>

        {/* Side rail: legend + status tally + dateline */}
        <aside className="space-y-5 animate-ink-rise stagger-2">
          <div className="border border-ink/20 bg-paper-deep">
            <div className="border-b border-rule px-4 py-3">
              <div className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
                Legenda
              </div>
              <div
                className="mt-1 font-display text-xl italic text-ink"
                style={{ fontVariationSettings: '"opsz" 36, "SOFT" 50' }}
              >
                Status Pangan
              </div>
            </div>
            <ul className="divide-y divide-rule">
              {(["surplus", "cukup", "waspada", "defisit"] as const).map((s) => (
                <li
                  key={s}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span className="flex items-center gap-3">
                    <span
                      className="inline-block h-4 w-7 border border-ink/30"
                      style={{ backgroundColor: STATUS_COLOR[s] }}
                    />
                    <span className="font-display italic text-ink">{STATUS_LABEL[s]}</span>
                  </span>
                  <span className="font-mono tabular-nums text-ink">
                    {counts[s] ?? 0}
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-t border-rule px-4 py-3 font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
              Ambang: surplus &gt; +10% · defisit &lt; −10%
            </div>
          </div>

          <div className="border border-ink/20 bg-paper-deep p-4">
            <div className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
              Catatan Kartografer
            </div>
            <p className="mt-2 font-display text-[15px] italic leading-relaxed text-ink-soft">
              Day 1: 7 polygon dummy mewakili kecamatan Jawa Barat. Day 3 akan memuat batas asli
              dari GADM level 3 + diwarnai oleh output{" "}
              <span className="not-italic font-mono text-[12px]">model/predict.py</span>.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
