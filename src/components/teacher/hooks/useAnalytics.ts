import { useState, useCallback } from "react";

/**
 * Encapsulates analytics data fetching for a given stream.
 * The generic parameter T lets callers type the response shape without
 * coupling the hook to a specific API payload structure.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAnalytics<T = any>(streamId: string | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<T | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!streamId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/teacher/analytics?streamId=${encodeURIComponent(streamId)}`);
      const json = (await res.json()) as T | { error?: string };
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Ошибка загрузки статистики");
      setData(json as T);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки статистики");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [streamId]);

  return {
    analyticsLoading: loading,
    analyticsError: error,
    analyticsData: data,
    fetchAnalytics,
  };
}
