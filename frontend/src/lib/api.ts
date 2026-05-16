import type {
  CropType,
  DashboardSummary,
  FeedbackRequest,
  FeedbackResponse,
  GeoJsonFC,
  KecamatanDetail,
  LahanResponse,
  PredictionHistoryResponse,
  PredictionsResponse,
  PredictRequest,
  PredictResponse,
  Province,
  VarietiesResponse,
  WeatherResponse,
  YieldTrend,
} from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4200";
const TTL_MS = 5 * 60 * 1000;

type CacheEntry = { data: unknown; expiresAt: number; inflight?: Promise<unknown> };
const cache = new Map<string, CacheEntry>();

function qs(obj: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export const apiPath = {
  dashboardSummary: (province = "DI Yogyakarta", commodity = "padi") =>
    `/api/dashboard/summary${qs({ province, commodity })}`,
  dashboardTrend: (province = "DI Yogyakarta", commodity = "padi") =>
    `/api/dashboard/trend${qs({ province, commodity })}`,
  predictionsList: (province = "DI Yogyakarta", commodity = "padi", season = "MT 2024-1") =>
    `/api/predictions${qs({ province, commodity, season })}`,
  predictionsDetail: (id: string, commodity = "padi") =>
    `/api/predictions/${id}${qs({ commodity })}`,
  predictionsHistory: (petani_id?: string, lahan_id?: string, limit = 50) =>
    `/api/predictions/history${qs({ petani_id, lahan_id, limit })}`,
  regionsGeojson: (province = "DI Yogyakarta") =>
    `/api/regions/geojson${qs({ province })}`,
  regionsProvinces: () => `/api/regions/provinces`,
  lahanList: (petani_id?: string) => `/api/lahan${qs({ petani_id })}`,
  varietiesList: (crop_type: CropType) => `/api/varieties${qs({ crop_type })}`,
  weatherRecent: (lat: number, lon: number, days = 7) =>
    `/api/weather/recent${qs({ lat, lon, days })}`,
};

function invalidate(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

export function peek<T>(path: string): T | null {
  const hit = cache.get(path);
  if (hit && hit.expiresAt > Date.now()) return hit.data as T;
  return null;
}

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const now = Date.now();
  const hit = cache.get(path);
  if (hit && hit.expiresAt > now) return hit.data as T;
  if (hit?.inflight) return hit.inflight as Promise<T>;

  const inflight = (async () => {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
    if (!res.ok) {
      cache.delete(path);
      throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as T;
    cache.set(path, { data, expiresAt: Date.now() + TTL_MS });
    return data;
  })();

  cache.set(path, { data: hit?.data, expiresAt: hit?.expiresAt ?? 0, inflight });
  return inflight;
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
    summary: (province = "DI Yogyakarta", commodity = "padi") =>
      get<DashboardSummary>(apiPath.dashboardSummary(province, commodity)),
    trend: (province = "DI Yogyakarta", commodity = "padi") =>
      get<YieldTrend>(apiPath.dashboardTrend(province, commodity)),
  },
  predictions: {
    list: (province = "DI Yogyakarta", commodity = "padi", season = "MT 2024-1") =>
      get<PredictionsResponse>(apiPath.predictionsList(province, commodity, season)),
    detail: (id: string, commodity = "padi") =>
      get<KecamatanDetail>(apiPath.predictionsDetail(id, commodity)),
    history: (petani_id?: string, lahan_id?: string, limit = 50) =>
      get<PredictionHistoryResponse>(apiPath.predictionsHistory(petani_id, lahan_id, limit)),
  },
  regions: {
    geojson: (province = "DI Yogyakarta") =>
      get<GeoJsonFC>(apiPath.regionsGeojson(province)),
    provinces: () =>
      get<{ count: number; items: Province[] }>(apiPath.regionsProvinces()),
  },
  lahan: {
    list: (petani_id?: string) => get<LahanResponse>(apiPath.lahanList(petani_id)),
  },
  varieties: {
    list: (crop_type: CropType) =>
      get<VarietiesResponse>(apiPath.varietiesList(crop_type)),
  },
  weather: {
    recent: (lat: number, lon: number, days = 7) =>
      get<WeatherResponse>(apiPath.weatherRecent(lat, lon, days)),
  },
  ml: {
    predict: async (
      req: PredictRequest,
      opts?: { petani_id?: string; lahan_id?: string },
    ) => {
      const params = new URLSearchParams();
      if (opts?.petani_id) params.set("petani_id", opts.petani_id);
      if (opts?.lahan_id)  params.set("lahan_id", opts.lahan_id);
      const query = params.toString() ? `?${params.toString()}` : "";
      const result = await post<PredictRequest, PredictResponse>(`/api/predict${query}`, req);
      invalidate("/api/lahan");
      invalidate("/api/predictions");
      invalidate("/api/dashboard");
      return result;
    },
    feedback: async (req: FeedbackRequest) => {
      const result = await post<FeedbackRequest, FeedbackResponse>("/api/feedback", req);
      invalidate("/api/predictions");
      return result;
    },
  },
  invalidate,
  peek,
};
