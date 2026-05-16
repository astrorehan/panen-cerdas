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
  const cached = key ? peek<T>(key) : null;
  const [data, setData] = useState<T | null>(cached);
  const [loading, setLoading] = useState(cached == null && key != null);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    if (!key) {
      setData(null);
      setLoading(false);
      return;
    }
    const next = peek<T>(key);
    if (next != null) {
      setData(next);
      setLoading(false);
    } else {
      setData(null);
      setLoading(true);
    }
    return run();
  }, [key, run]);

  const refresh = useCallback(() => {
    setLoading(true);
    run();
  }, [run]);

  return { data, loading, error, refresh };
}
