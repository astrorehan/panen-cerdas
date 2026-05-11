export type StatusPangan = "surplus" | "cukup" | "waspada" | "defisit";

export type KpiTile = {
  label: string;
  value: string;
  delta: string | null;
  positive: boolean;
};

export type DashboardSummary = {
  province: string;
  season: string;
  tiles: KpiTile[];
};

export type YieldPoint = {
  year: number;
  value: number;
  kind: "aktual" | "prediksi";
};

export type YieldTrend = {
  province: string;
  commodity: string;
  unit: string;
  points: YieldPoint[];
};

export type KecamatanPrediction = {
  id: string;
  kabupaten: string;
  kecamatan: string;
  yield_pred_ton_per_ha: number;
  luas_panen_ha: number;
  produksi_pred_ton: number;
  surplus_pct: number;
  status: StatusPangan;
};

export type PredictionsResponse = {
  province: string;
  commodity: string;
  season: string;
  items: KecamatanPrediction[];
};

export type NdviPoint = { date: string; ndvi: number };

export type KecamatanDetail = {
  kecamatan: string;
  kabupaten: string;
  yield_pred_ton_per_ha: number;
  luas_panen_ha: number;
  total_produksi_ton: number;
  ndvi_series: NdviPoint[];
  backtest: YieldPoint[];
};

export type GeoJsonFC = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { id: string; kabupaten: string; kecamatan: string };
    geometry: { type: "Polygon"; coordinates: number[][][] };
  }>;
};
