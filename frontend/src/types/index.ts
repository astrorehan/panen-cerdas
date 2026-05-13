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

export type CropType =
  | "padi"
  | "jagung"
  | "kedelai"
  | "ubi_jalar"
  | "ubi_kayu"
  | "cabe_besar"
  | "cabe_rawit"
  | "bawang_merah"
  | "bawang_putih";
export type RiskLevel = "low" | "medium" | "high";
export type Provenance = "manual" | "estimated" | "default" | "fallback";

export type PredictRequest = {
  crop_type: CropType;
  land_area_ha: number;
  pest_pressure: number;
  variety: string;
  lat?: number | null;
  lon?: number | null;
  ndvi?: number | null;
  rainfall_mm?: number | null;
  temperature_c?: number | null;
  solar_radiation?: number | null;
};

export type PredictResponse = {
  prediction_log_id: number;
  harvest_days: number;
  yield_ton_per_ha: number;
  total_yield_ton: number;
  risk_level: RiskLevel;
  confidence: number;
  recommendations: string[];
  climate_source: Provenance;
  ndvi_source: Provenance;
};

export type FeedbackRequest = {
  prediction_log_id: number;
  actual_harvest_days: number;
  actual_yield_ton_per_ha: number;
  notes?: string;
};

export type FeedbackResponse = {
  status: "received";
  feedback_id: number;
};
