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
  // index predictions by id for fast lookup
  const byId = useMemo(() => {
    const m = new Map<string, KecamatanPrediction>();
    for (const p of predictions) m.set(p.id, p);
    return m;
  }, [predictions]);

  // suppress hydration mismatch warnings from leaflet's icon paths
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
    const color = pred ? STATUS_COLOR[pred.status] : "#BDBDBD";
    return {
      color: "#1B5E20",
      weight: 1.2,
      fillColor: color,
      fillOpacity: 0.65,
    };
  };

  const onEachFeature = (feature: Feature, layer: L.Layer) => {
    const props = feature.properties as { id?: string; kecamatan?: string; kabupaten?: string };
    const pred = props.id ? byId.get(props.id) : undefined;
    const html = `
      <div style="font-family:system-ui;font-size:13px;line-height:1.4;min-width:180px">
        <div style="font-weight:700;font-size:14px">${props.kecamatan ?? "-"}</div>
        <div style="color:#6b7280;margin-bottom:6px">Kab. ${props.kabupaten ?? "-"}</div>
        ${
          pred
            ? `<div>Yield prediksi: <b>${pred.yield_pred_ton_per_ha.toFixed(2)} ton/ha</b></div>
               <div>Produksi: <b>${pred.produksi_pred_ton.toLocaleString("id-ID")} ton</b></div>
               <div>Status: <b style="color:${STATUS_COLOR[pred.status]}">${STATUS_LABEL[pred.status]}</b> (${pred.surplus_pct > 0 ? "+" : ""}${pred.surplus_pct.toFixed(1)}%)</div>`
            : `<div style="color:#9ca3af">Belum ada prediksi</div>`
        }
      </div>
    `;
    layer.bindTooltip(html, { sticky: true });
    if (onSelect && props.id) {
      layer.on({ click: () => onSelect(props.id!) });
    }
  };

  return (
    <MapContainer center={JABAR_CENTER} zoom={8} className="h-[560px] w-full rounded-xl overflow-hidden">
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <GeoJSON data={geojson as GeoJsonObject} style={styleFor} onEachFeature={onEachFeature} />
    </MapContainer>
  );
}
