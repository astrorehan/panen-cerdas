"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Feature, GeoJsonObject } from "geojson";
import type { KecamatanPrediction, GeoJsonFC } from "@/types";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/utils";
import L from "leaflet";

type Props = {
  geojson: GeoJsonFC;
  predictions: KecamatanPrediction[];
  national?: boolean;
  center?: [number, number];
  zoom?: number;
  /** Stable identifier per region so the map remounts (and re-centers) when user switches province. */
  viewKey?: string;
  onSelect?: (id: string) => void;
};

const DIY_CENTER: [number, number] = [-7.855, 110.42];
const INDONESIA_CENTER: [number, number] = [-2.5, 117.5];

export default function ChoroplethMap({
  geojson,
  predictions,
  national = false,
  center,
  zoom,
  viewKey,
  onSelect,
}: Props) {
  const byId = useMemo(() => {
    const m = new Map<string, KecamatanPrediction>();
    for (const p of predictions) m.set(p.id, p);
    return m;
  }, [predictions]);

  // Range produksi untuk bubble size di mode nasional
  const produksiRange = useMemo(() => {
    if (predictions.length === 0) return { min: 0, max: 1 };
    const values = predictions.map((p) => p.produksi_pred_ton);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [predictions]);

  useEffect(() => {
    // @ts-expect-error _getIconUrl is private but commonly patched
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  // Style untuk polygon (DIY mode)
  const styleFor = (feature?: Feature) => {
    const id = (feature?.properties as { id?: string } | undefined)?.id;
    const pred = id ? byId.get(id) : undefined;
    const color = pred ? STATUS_COLOR[pred.status] : "#E7E2D6";
    return {
      color:       "#FFFFFF",
      weight:      1.6,
      fillColor:   color,
      fillOpacity: 0.82,
    };
  };

  // Konversi Point feature jadi CircleMarker dengan size proporsional produksi
  const pointToLayer = (feature: Feature, latlng: L.LatLng): L.Layer => {
    const id = (feature.properties as { id?: string } | undefined)?.id;
    const pred = id ? byId.get(id) : undefined;
    const color = pred ? STATUS_COLOR[pred.status] : "#9CA39B";

    let radius = 10;
    if (pred) {
      const range = produksiRange.max - produksiRange.min || 1;
      const t = (pred.produksi_pred_ton - produksiRange.min) / range;
      radius = 8 + t * 24; // 8..32 px
    }

    return L.circleMarker(latlng, {
      radius,
      color:       "#FFFFFF",
      weight:      1.5,
      fillColor:   color,
      fillOpacity: 0.78,
    });
  };

  const onEachFeature = (feature: Feature, layer: L.Layer) => {
    const props = feature.properties as {
      id?: string;
      kecamatan?: string;
      kabupaten?: string;
      name?: string;
      level?: string;
    };
    const pred = props.id ? byId.get(props.id) : undefined;
    const isProvince = props.level === "province" || !!props.name;

    const title = isProvince ? props.name : props.kecamatan;
    const subtitle = isProvince
      ? "Provinsi"
      : `Kab. ${props.kabupaten ?? "-"}`;

    const html = `
      <div style="font-family:var(--font-sans, system-ui);font-size:12px;line-height:1.5;min-width:220px;color:#0F1F18">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#6B7568;font-weight:500;margin-bottom:2px">
          ${subtitle}
        </div>
        <div style="font-size:16px;font-weight:600;letter-spacing:-0.01em;margin-bottom:10px">
          ${title ?? "-"}
        </div>
        ${
          pred
            ? `<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 14px;font-size:11px;color:#6B7568">
                 <span>Yield</span><span style="color:#0F1F18;font-weight:600">${pred.yield_pred_ton_per_ha.toFixed(2)} t/ha</span>
                 <span>Produksi</span><span style="color:#0F1F18;font-weight:600">${pred.produksi_pred_ton.toLocaleString("id-ID")} ton</span>
                 <span>Luas</span><span style="color:#0F1F18;font-weight:600">${pred.luas_panen_ha.toLocaleString("id-ID")} ha</span>
                 <span>Surplus</span><span style="color:${STATUS_COLOR[pred.status]};font-weight:700">${pred.surplus_pct > 0 ? "+" : ""}${pred.surplus_pct.toFixed(1)}%</span>
                 <span>Status</span><span style="color:${STATUS_COLOR[pred.status]};font-weight:700">${STATUS_LABEL[pred.status]}</span>
               </div>
               <div style="margin-top:10px;padding-top:8px;border-top:1px solid #E7E2D6;font-size:10px;color:#1F5132;font-weight:500">Klik untuk drill-down -></div>`
            : `<div style="color:#9CA39B;font-size:11px">Belum ada prediksi</div>`
        }
      </div>
    `;
    layer.bindTooltip(html, {
      sticky:    true,
      direction: "top",
      offset:    [0, -6],
      className: "pc-tooltip",
    });

    layer.on({
      mouseover: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: 0.95, weight: 2.5 });
      },
      mouseout: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: national ? 0.78 : 0.82, weight: 1.5 });
      },
      click: () => onSelect && props.id && onSelect(props.id),
    });
  };

  const resolvedCenter = center ?? (national ? INDONESIA_CENTER : DIY_CENTER);
  const resolvedZoom   = zoom   ?? (national ? 5 : 10);

  return (
    <>
      <style jsx global>{`
        .leaflet-tooltip.pc-tooltip {
          background: #ffffff;
          border: 1px solid #e7e2d6;
          border-radius: 12px;
          padding: 12px 14px;
          color: #0f1f18;
          box-shadow:
            0 4px 12px rgba(15, 31, 24, 0.08),
            0 12px 32px rgba(15, 31, 24, 0.1);
        }
        .leaflet-tooltip.pc-tooltip::before {
          display: none;
        }
        .leaflet-control-zoom a {
          background-color: #ffffff !important;
          color: #0f1f18 !important;
          border: 1px solid #e7e2d6 !important;
          border-radius: 8px !important;
          margin-bottom: 4px !important;
          box-shadow: 0 1px 2px rgba(15, 31, 24, 0.04) !important;
        }
        .leaflet-control-zoom a:hover {
          background-color: #e8f0e5 !important;
          color: #1f5132 !important;
        }
        .leaflet-control-attribution {
          background: rgba(255, 255, 255, 0.85) !important;
          color: #6b7568 !important;
          font-size: 10px !important;
          border-radius: 6px !important;
          padding: 2px 6px !important;
        }
      `}</style>
      <MapContainer
        key={viewKey ?? `${national ? "nat" : "diy"}-${predictions.length}`}
        center={resolvedCenter}
        zoom={resolvedZoom}
        className="h-[600px] w-full"
        zoomControl={true}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap - CARTO"
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <GeoJSON
          data={geojson as GeoJsonObject}
          style={styleFor}
          pointToLayer={pointToLayer}
          onEachFeature={onEachFeature}
        />
      </MapContainer>
    </>
  );
}
