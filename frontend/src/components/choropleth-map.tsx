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
  onSelect?: (id: string) => void;
};

const JABAR_CENTER: [number, number] = [-6.9147, 107.6098];

export default function ChoroplethMap({ geojson, predictions, onSelect }: Props) {
  const byId = useMemo(() => {
    const m = new Map<string, KecamatanPrediction>();
    for (const p of predictions) m.set(p.id, p);
    return m;
  }, [predictions]);

  useEffect(() => {
    // @ts-expect-error _getIconUrl is private but commonly patched
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  const styleFor = (feature?: Feature) => {
    const id = (feature?.properties as { id?: string } | undefined)?.id;
    const pred = id ? byId.get(id) : undefined;
    const color = pred ? STATUS_COLOR[pred.status] : "#E7E2D6";
    return {
      color: "#FFFFFF",
      weight: 1.6,
      fillColor: color,
      fillOpacity: 0.82,
      dashArray: undefined as string | undefined,
    };
  };

  const onEachFeature = (feature: Feature, layer: L.Layer) => {
    const props = feature.properties as { id?: string; kecamatan?: string; kabupaten?: string };
    const pred = props.id ? byId.get(props.id) : undefined;
    const html = `
      <div style="font-family:var(--font-sans, system-ui);font-size:12px;line-height:1.5;min-width:220px;color:#0F1F18">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#6B7568;font-weight:500;margin-bottom:2px">
          Kab. ${props.kabupaten ?? "-"}
        </div>
        <div style="font-size:16px;font-weight:600;letter-spacing:-0.01em;margin-bottom:10px">
          ${props.kecamatan ?? "-"}
        </div>
        ${
          pred
            ? `<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 14px;font-size:11px;color:#6B7568">
                 <span>Yield</span><span style="color:#0F1F18;font-weight:600">${pred.yield_pred_ton_per_ha.toFixed(2)} t/ha</span>
                 <span>Produksi</span><span style="color:#0F1F18;font-weight:600">${pred.produksi_pred_ton.toLocaleString("id-ID")} ton</span>
                 <span>Surplus</span><span style="color:${STATUS_COLOR[pred.status]};font-weight:700">${pred.surplus_pct > 0 ? "+" : ""}${pred.surplus_pct.toFixed(1)}%</span>
                 <span>Status</span><span style="color:${STATUS_COLOR[pred.status]};font-weight:700">${STATUS_LABEL[pred.status]}</span>
               </div>
               <div style="margin-top:10px;padding-top:8px;border-top:1px solid #E7E2D6;font-size:10px;color:#1F5132;font-weight:500">Klik untuk drill-down -></div>`
            : `<div style="color:#9CA39B;font-size:11px">Belum ada prediksi</div>`
        }
      </div>
    `;
    layer.bindTooltip(html, {
      sticky: true,
      direction: "top",
      offset: [0, -6],
      className: "pc-tooltip",
    });

    layer.on({
      mouseover: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: 0.95, weight: 2.5 });
      },
      mouseout: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: 0.82, weight: 1.6 });
      },
      click: () => onSelect && props.id && onSelect(props.id),
    });
  };

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
        center={JABAR_CENTER}
        zoom={8}
        className="h-[600px] w-full"
        zoomControl={true}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap - CARTO"
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <GeoJSON data={geojson as GeoJsonObject} style={styleFor} onEachFeature={onEachFeature} />
      </MapContainer>
    </>
  );
}
