import type {
  DashboardSummary,
  FeedbackRequest,
  FeedbackResponse,
  GeoJsonFC,
  KecamatanDetail,
  PredictionsResponse,
  PredictRequest,
  PredictResponse,
  YieldTrend,
} from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4400";

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

async function post<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      (data && (data.detail || data.error || JSON.stringify(data))) ||
      `${res.status} ${res.statusText}`;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data as TRes;
}

export const api = {
  dashboard: {
    summary: (province = "DI Yogyakarta", season = "MT 2024") =>
      get<DashboardSummary>(
        `/api/dashboard/summary?province=${encodeURIComponent(province)}&season=${encodeURIComponent(season)}`,
      ),
    trend: (province = "DI Yogyakarta", commodity = "padi") =>
      get<YieldTrend>(
        `/api/dashboard/trend?province=${encodeURIComponent(province)}&commodity=${encodeURIComponent(commodity)}`,
      ),
  },
  predictions: {
    list: (province = "DI Yogyakarta", commodity = "padi", season = "MT 2024-1") =>
      get<PredictionsResponse>(
        `/api/predictions?province=${encodeURIComponent(province)}&commodity=${encodeURIComponent(commodity)}&season=${encodeURIComponent(season)}`,
      ),
    detail: (id: string) => get<KecamatanDetail>(`/api/predictions/${id}`),
  },
  regions: {
    geojson: (province = "DI Yogyakarta") =>
      get<GeoJsonFC>(`/api/regions/geojson?province=${encodeURIComponent(province)}`),
  },
  ml: {
    predict: (req: PredictRequest) =>
      post<PredictRequest, PredictResponse>("/api/predict", req),
    feedback: (req: FeedbackRequest) =>
      post<FeedbackRequest, FeedbackResponse>("/api/feedback", req),
  },
};
