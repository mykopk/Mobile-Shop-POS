"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/apiClient";

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(
    async (signal: AbortSignal) => {
      if (!path) return;
      setLoading(true);
      setError(null);
      try {
        const result = await apiRequest<T>(path, { signal });
        if (signal.aborted) return;
        setData(result);
      } catch (err) {
        if (signal.aborted) return;
        setError(err instanceof Error ? err.message : "Request failed");
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [path],
  );

  const refetch = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    void fetchData(controller.signal);
  }, [fetchData]);

  useEffect(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    void fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  return { data, loading, error, refetch };
}
