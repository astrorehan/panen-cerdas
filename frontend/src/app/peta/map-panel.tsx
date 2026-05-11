"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { GeoJsonFC, KecamatanPrediction } from "@/types";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/utils";

const ChoroplethMap = dynamic(() => import("@/components/choropleth-map"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[560px] place-items-center rounded-xl border bg-muted text-sm text-muted-foreground">
      Memuat peta...
    </div>
  ),
});

type Props = {
  geojson: GeoJsonFC;
  predictions: KecamatanPrediction[];
};

export function MapPanel({ geojson, predictions }: Props) {
  const router = useRouter();
  return (
    <div className="relative">
      <ChoroplethMap
        geojson={geojson}
        predictions={predictions}
        onSelect={(id) => router.push(`/detail?id=${id}`)}
      />
      <div className="pointer-events-none absolute bottom-3 left-3 z-[400] rounded-lg border bg-white/95 p-3 shadow-md backdrop-blur">
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Status Pangan
        </div>
        <ul className="space-y-1 text-sm">
          {(["surplus", "cukup", "waspada", "defisit"] as const).map((s) => (
            <li key={s} className="flex items-center gap-2">
              <span
                className="inline-block h-3.5 w-3.5 rounded-sm"
                style={{ backgroundColor: STATUS_COLOR[s] }}
              />
              {STATUS_LABEL[s]}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
