"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { GeoJsonFC, KecamatanPrediction } from "@/types";

const ChoroplethMap = dynamic(() => import("@/components/choropleth-map"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[560px] place-items-center bg-paper-edge font-mono text-[11px] uppercase tracking-smallcaps text-ink-faint">
      Memuat peta…
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
    <div className="relative border-t border-rule">
      <ChoroplethMap
        geojson={geojson}
        predictions={predictions}
        onSelect={(id) => router.push(`/detail?id=${id}`)}
      />
      {/* Cartographic frame overlays */}
      <div className="pointer-events-none absolute left-3 top-3 z-[400] font-mono text-[10px] uppercase tracking-smallcaps text-ink-soft">
        N ↑
      </div>
      <div className="pointer-events-none absolute right-3 top-3 z-[400] font-mono text-[10px] uppercase tracking-smallcaps text-ink-soft">
        EPSG:4326
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 z-[400] font-mono text-[10px] uppercase tracking-smallcaps text-ink-soft">
        Tile · OSM/Carto
      </div>
    </div>
  );
}
