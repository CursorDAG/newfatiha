import { useState, useCallback, useRef } from "react";
import type { HomeworkAssignmentSummary } from "@/components/teacher/TeacherHomeworkTab";

/**
 * Encapsulates homework assignment list fetching for a given stream.
 * The parent provides `onError` to surface toast notifications.
 *
 * `onError` is stored in a ref so it never appears in the useCallback
 * dependency array — this keeps `fetchHomework` stable across renders
 * and prevents the infinite-render loop that would occur if an inline
 * arrow function were passed as `onError` from the parent.
 */
export function useHomework(
  streamId: string | null,
  onError: (msg: string) => void,
) {
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState<HomeworkAssignmentSummary[]>([]);

  const fetch_ = useCallback(async () => {
    if (!streamId) {
      setAssignments([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/teacher/homework?streamId=${encodeURIComponent(streamId)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Не удалось загрузить задания");
      setAssignments(json.assignments ?? []);
    } catch (e: unknown) {
      onErrorRef.current(e instanceof Error ? e.message : "Ошибка загрузки заданий");
    } finally {
      setLoading(false);
    }
  }, [streamId]); // onError intentionally excluded — accessed via ref

  return { homeworkLoading: loading, homeworkAssignments: assignments, fetchHomework: fetch_ };
}
