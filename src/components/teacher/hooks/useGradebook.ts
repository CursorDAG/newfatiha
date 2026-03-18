import { useState, useCallback } from "react";
import type { GradebookPayload } from "@/app/api/teacher/gradebook/route";

/**
 * Encapsulates gradebook data fetching for a given stream.
 */
export function useGradebook(streamId: string | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<GradebookPayload | null>(null);

  const fetch_ = useCallback(async () => {
    if (!streamId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/teacher/gradebook?streamId=${encodeURIComponent(streamId)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Ошибка загрузки журнала");
      setData(json as GradebookPayload);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки журнала");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [streamId]);

  return { gradebookLoading: loading, gradebookError: error, gradebookData: data, fetchGradebook: fetch_ };
}
