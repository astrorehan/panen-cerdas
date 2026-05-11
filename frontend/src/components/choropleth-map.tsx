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
    const color = pred ? STATUS_COLOR[pred.status] : "#BDB59D";
    return {
      color: "#1A1D1B",
      weight: 1.4,
      fillColor: color,
      fillOpacity: 0.78,
      dashArray: undefined as string | undefined,
    };
  };

  const onEachFeature = (feature: Feature, layer: L.Layer) => {
    const props = feature.properties as { id?: string; kecamatan?: string; kabupaten?: string };
    const pred = props.id ? byId.get(props.id) : undefined;
    const html = `
      <div style="font-family:var(--font-sans, system-ui);font-size:12px;line-height:1.5;min-width:210px;color:#1A1D1B">
        <div style="font-family:var(--font-mono, monospace);font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#6B6F5F;margin-bottom:3px">
          Kab. ${props.kabupaten ?? "-"}
        </div>
        <div style="font-family:var(--font-display, Georgia, serif);font-size:20px;font-style:italic;line-height:1.05;margin-bottom:8px">
          ${props.kecamatan ?? "-"}
        </div>
        ${
          pred
            ? `<div style="display:grid;grid-template-columns:auto 1fr;gap:2px 12px;font-family:var(--font-mono, monospace);font-size:10.5px;text-transform:uppercase;letter-spacing:0.08em;color:#6B6F5F">
                 <span>Yield</span><span style="color:#1A1D1B;font-weight:600">${pred.yield_pred_ton_per_ha.toFixed(2)} t/ha</span>
                 <span>Produksi</span><span style="color:#1A1D1B;font-weight:600">${pred.produksi_pred_ton.toLocaleString("id-ID")} ton</span>
                 <span>Surplus</span><span style="color:${STATUS_COLOR[pred.status]};font-weight:700">${pred.surplus_pct > 0 ? "+" : ""}${pred.surplus_pct.toFixed(1)}%</span>
                 <span>Status</span><span style="color:${STATUS_COLOR[pred.status]};font-weight:700">${STATUS_LABEL[pred.status].toUpperCase()}</span>
               </div>
               <div style="margin-top:8px;padding-top:6px;border-top:1px solid #C8C0A8;font-family:var(--font-mono, monospace);font-size:9.5px;text-transform:uppercase;letter-spacing:0.14em;color:#6B6F5F">Klik untuk drill-down →</div>`
            : `<div style="color:#9A9A88;font-family:var(--font-mono, monospace);font-size:10px;text-transform:uppercase;letter-spacing:0.14em">Belum ada prediksi</div>`
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
        l.setStyle({ fillOpacity: 0.95, weight: 2.2 });
      },
      mouseout: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: 0.78, weight: 1.4 });
      },
      click: () => onSelect && props.id && onSelect(props.id),
    });
  };

  return (
    <>
      <style jsx global>{`
        .leaflet-tooltip.pc-tooltip {
          background: #f4efe6;
          border: 1px solid #1a1d1b;
          border-radius: 0;
          padding: 10px 12px;
          color: #1a1d1b;
          box-shadow: 4px 4px 0 rgba(26, 29, 27, 0.15);
        }
        .leaflet-tooltip.pc-tooltip::before {
          display: none;
        }
        .leaflet-control-zoom a {
          background-color: #f4efe6 !important;
          color: #1a1d1b !important;
          border: 1px solid #1a1d1b !important;
          border-bottom: 0 !important;
          border-radius: 0 !important;
          font-family: var(--font-mono), monospace !important;
        }
        .leaflet-control-zoom a:last-child {
          border-bottom: 1px solid #1a1d1b !important;
        }
        .leaflet-control-attribution {
          background: rgba(244, 239, 230, 0.7) !important;
          color: #6b6f5f !important;
          font-family: var(--font-mono), monospace !important;
          font-size: 9px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.08em !important;
        }
      `}</style>
      <MapContainer
        center={JABAR_CENTER}
        zoom={8}
        className="h-[600px] w-full"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap · CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <GeoJSON data={geojson as GeoJsonObject} style={styleFor} onEachFeature={onEachFeature} />
      </MapContainer>
    </>
  );
}
