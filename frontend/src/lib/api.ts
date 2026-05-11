import type {
  DashboardSummary,
  GeoJsonFC,
  KecamatanDetail,
  PredictionsResponse,
  YieldTrend,
} from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

export const api = {
  dashboard: {
    summary: (province = "Jawa Barat", season = "MT 2024") =>
      get<DashboardSummary>(
        `/api/dashboard/summary?province=${encodeURIComponent(province)}&season=${encodeURIComponent(season)}`,
      ),
    trend: (province = "Jawa Barat", commodity = "padi") =>
      get<YieldTrend>(
        `/api/dashboard/trend?province=${encodeURIComponent(province)}&commodity=${encodeURIComponent(commodity)}`,
      ),
  },
  predictions: {
    list: (province = "Jawa Barat", commodity = "padi", season = "MT 2024-1") =>
      get<PredictionsResponse>(
        `/api/predictions?province=${encodeURIComponent(province)}&commodity=${encodeURIComponent(commodity)}&season=${encodeURIComponent(season)}`,
      ),
    detail: (id: string) => get<KecamatanDetail>(`/api/predictions/${id}`),
  },
  regions: {
    geojson: (province = "Jawa Barat") =>
      get<GeoJsonFC>(`/api/regions/geojson?province=${encodeURIComponent(province)}`),
  },
};
