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
  ndvi_source?: "modis_appeears" | "seasonal_estimate";
  backtest: YieldPoint[];
};

export type GeoFeature =
  | {
      type: "Feature";
      properties: { id: string; kabupaten: string; kecamatan: string };
      geometry: { type: "Polygon"; coordinates: number[][][] };
    }
  | {
      type: "Feature";
      properties: {
        id: string;
        code: string;
        name: string;
        kementan_name: string;
        capital: string;
        region: string;
        level: "province";
      };
      geometry: { type: "Point"; coordinates: [number, number] };
    };

export type GeoJsonFC = {
  type: "FeatureCollection";
  level?: "kecamatan" | "province";
  features: GeoFeature[];
};

export type Province = {
  id: string;          // "PROV_<code>"
  code: string;        // Kementan 2-digit code
  name: string;        // Display name
  capital: string;
  region: string;      // "Jawa" | "Sumatera" | ...
  lat: number;
  lon: number;
};

export type LahanItem = {
  lahan_id: string;
  petani_id: string | null;
  last_crop_type: CropType | null;
  last_yield_ton_per_ha: number | null;
  last_harvest_days: number | null;
  last_risk_level: RiskLevel | null;
  last_land_area_ha: number | null;
  last_lat: number | null;
  last_lon: number | null;
  last_predicted_at: string;
  total_predictions: number;
  total_feedback: number;
  status: "tumbuh" | "panen-segera" | "kosong";
};

export type LahanResponse = {
  petani_id: string | null;
  total: number;
  total_ha: number;
  aktif: number;
  items: LahanItem[];
};

export type Variety = {
  name: string;
  yield_modifier: number;
  days_modifier: number;
  estimated_yield: number;
  estimated_days: number;
};

export type VarietiesResponse = {
  crop_type: CropType;
  varieties: Variety[];
};

export type PredictionHistoryItem = {
  id: number;
  petani_id: string | null;
  lahan_id: string | null;
  crop_type: CropType;
  land_area_ha: number;
  ndvi: number;
  rainfall_mm: number;
  temperature_c: number;
  solar_radiation: number;
  pred_harvest_days: number;
  pred_yield_ton_per_ha: number;
  pred_risk_level: RiskLevel;
  confidence: number;
  model_source: "ml_model" | "fallback_rules";
  feedback_given: boolean;
  created_at: string;
};

export type PredictionHistoryResponse = {
  petani_id: string | null;
  lahan_id: string | null;
  total: number;
  items: PredictionHistoryItem[];
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
export type Provenance =
  | "manual"
  | "estimated"
  | "default"
  | "fallback"
  | "user_input"
  | "nasa_power"
  | "appeears"
  | "modis_appeears"
  | "seasonal_estimate"
  | (string & {});

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
