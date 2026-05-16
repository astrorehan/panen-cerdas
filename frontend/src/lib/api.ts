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
  YieldTrend,
} from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4200";
const TTL_MS = 5 * 60 * 1000;

type CacheEntry = { data: unknown; expiresAt: number; inflight?: Promise<unknown> };
const cache = new Map<string, CacheEntry>();

function invalidate(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
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
      get<DashboardSummary>(
        `/api/dashboard/summary?province=${encodeURIComponent(province)}&commodity=${encodeURIComponent(commodity)}`,
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
    detail: (id: string, commodity = "padi") =>
      get<KecamatanDetail>(
        `/api/predictions/${id}?commodity=${encodeURIComponent(commodity)}`,
      ),
    history: (petani_id?: string, lahan_id?: string, limit = 50) => {
      const params = new URLSearchParams();
      if (petani_id) params.set("petani_id", petani_id);
      if (lahan_id)  params.set("lahan_id", lahan_id);
      params.set("limit", String(limit));
      return get<PredictionHistoryResponse>(
        `/api/predictions/history?${params.toString()}`,
      );
    },
  },
  regions: {
    geojson: (province = "DI Yogyakarta") =>
      get<GeoJsonFC>(`/api/regions/geojson?province=${encodeURIComponent(province)}`),
    provinces: () =>
      get<{ count: number; items: Province[] }>(`/api/regions/provinces`),
  },
  lahan: {
    list: (petani_id?: string) => {
      const q = petani_id ? `?petani_id=${encodeURIComponent(petani_id)}` : "";
      return get<LahanResponse>(`/api/lahan${q}`);
    },
  },
  varieties: {
    list: (crop_type: CropType) =>
      get<VarietiesResponse>(
        `/api/varieties?crop_type=${encodeURIComponent(crop_type)}`,
      ),
  },
  ml: {
    predict: async (
      req: PredictRequest,
      opts?: { petani_id?: string; lahan_id?: string },
    ) => {
      const params = new URLSearchParams();
      if (opts?.petani_id) params.set("petani_id", opts.petani_id);
      if (opts?.lahan_id)  params.set("lahan_id", opts.lahan_id);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const result = await post<PredictRequest, PredictResponse>(`/api/predict${qs}`, req);
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
};
