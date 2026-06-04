"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { GeoJsonFC, KabupatenPrediction } from "@/types";

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
  predictions: KabupatenPrediction[];
  national?: boolean;
  center?: [number, number];
  zoom?: number;
  viewKey?: string;
  commodity?: string;
};

export function MapPanel({
  geojson,
  predictions,
  national = false,
  center,
  zoom,
  viewKey,
  commodity,
}: Props) {
  const router = useRouter();
  return (
    // `isolate` contains Leaflet's internal z-index stack (panes/controls go up
    // to 1000) inside this element's own stacking context, so it can't paint
    // over the filter-bar dropdowns once the map mounts.
    <div className="relative isolate border-t border-rule">
      <ChoroplethMap
        geojson={geojson}
        predictions={predictions}
        national={national}
        center={center}
        zoom={zoom}
        viewKey={viewKey}
        onSelect={(id) => router.push(`/pemerintah/analisis?id=${id}${commodity ? `&commodity=${commodity}` : ""}`)}
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
