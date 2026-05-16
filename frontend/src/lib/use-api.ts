"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { peek } from "@/lib/api";

type State<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

export function useApi<T>(
  key: string | null,
  fetcher: () => Promise<T>,
): State<T> {
  const [data, setData] = useState<T | null>(() => (key ? peek<T>(key) : null));
  const [loading, setLoading] = useState(() => key != null && peek<T>(key) == null);
  const [error, setError] = useState<string | null>(null);

  // Reset state synchronously when key changes. Without this, callers see one
  // render with stale data tied to the previous key (the useEffect below runs
  // after commit), which manifests as the wrong subject being displayed during
  // route transitions.
  const [trackedKey, setTrackedKey] = useState(key);
  if (trackedKey !== key) {
    setTrackedKey(key);
    const next = key ? peek<T>(key) : null;
    setData(next);
    setLoading(key != null && next == null);
    setError(null);
  }

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(() => {
    if (!key) return () => {};
    let cancelled = false;
    fetcherRef.current()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    if (!key) return;
    return run();
  }, [key, run]);

  const refresh = useCallback(() => {
    setLoading(true);
    run();
  }, [run]);

  return { data, loading, error, refresh };
}
