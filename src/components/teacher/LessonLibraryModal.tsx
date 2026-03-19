"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import ModalShell from "@/components/teacher/ui/ModalShell";
import { Button } from "@/components/teacher/ui/Button";

// ── Types ───────────────────────────────────────────────────────────────────

type LibraryTemplate = {
  id: string;
  title: string;
  type: string;
  topic: string | null;
  level: string | null;
  quizzes: Array<{ id: string; title: string; type: string }>;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const LEVEL_OPTIONS = [
  { value: "", label: "Все уровни" },
  { value: "A1", label: "A1" },
  { value: "A2", label: "A2" },
  { value: "B1", label: "B1" },
  { value: "B2", label: "B2" },
  { value: "C1", label: "C1" },
  { value: "C2", label: "C2" },
];

function lessonTypeLabel(type: string): string {
  switch (type) {
    case "LIVE":
      return "LIVE";
    case "VIDEO":
      return "VIDEO";
    default:
      return "TEXT";
  }
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Modal for browsing the lesson template library and adding a template
 * to the currently selected stream. Opened from TeacherLessonsTab.
 */
export default function LessonLibraryModal({
  streamId,
  onClose,
  onAdded,
}: {
  streamId: string;
  onClose: () => void;
  /** Called after the template has been successfully cloned into the stream. */
  onAdded: () => void;
}) {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("");
  const [templates, setTemplates] = useState<LibraryTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTemplates = useCallback(
    async (topicQuery: string, levelQuery: string) => {
      setLoadingTemplates(true);
      setFetchError("");
      try {
        const url = new URL("/api/teacher/lessons/library", window.location.origin);
        if (topicQuery) url.searchParams.set("topic", topicQuery);
        if (levelQuery) url.searchParams.set("level", levelQuery);

        const res = await fetch(url.toString());
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Ошибка загрузки библиотеки");
        setTemplates(data.templates ?? []);
      } catch (e) {
        setFetchError(e instanceof Error ? e.message : "Неизвестная ошибка");
      } finally {
        setLoadingTemplates(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchTemplates(topic, level);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  function handleTopicChange(value: string) {
    setTopic(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchTemplates(value, level);
    }, 300);
  }

  async function handleAdd(templateId: string) {
    setAddingId(templateId);
    try {
      const res = await fetch("/api/teacher/lessons/from-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId, templateLessonId: templateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Не удалось добавить урок");
      onAdded();
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Ошибка добавления урока");
    } finally {
      setAddingId(null);
    }
  }

  return (
    <ModalShell
      title="Библиотека уроков"
      subtitle="Выберите шаблон и добавьте урок в текущий поток"
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Закрыть
        </Button>
      }
    >
      {/* ── Filters ── */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Поиск по теме…"
          value={topic}
          onChange={(e) => handleTopicChange(e.target.value)}
          className="flex-1 min-w-[160px] border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-400 outline-none bg-slate-50 focus:bg-white"
        />
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-400 outline-none bg-slate-50 focus:bg-white"
        >
          {LEVEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Error ── */}
      {fetchError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          {fetchError}
        </p>
      )}

      {/* ── Template list ── */}
      <div className="overflow-y-auto max-h-[50vh] -mx-6 px-6 space-y-2">
        {loadingTemplates ? (
          <p className="text-sm text-slate-500 text-center py-6">Загрузка…</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">
            Шаблонов не найдено. Попробуйте изменить фильтры.
          </p>
        ) : (
          templates.map((tpl) => (
            <div
              key={tpl.id}
              className="border border-slate-200 rounded-xl p-4 bg-white flex items-center justify-between gap-4 hover:border-emerald-300 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {lessonTypeLabel(tpl.type)}
                  </span>
                  {tpl.level && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full uppercase">
                      {tpl.level}
                    </span>
                  )}
                  {tpl.quizzes.length > 0 && (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
                      {tpl.quizzes.length} тест{tpl.quizzes.length > 1 ? "а" : ""}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-slate-800 truncate">{tpl.title}</p>
                {tpl.topic && (
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{tpl.topic}</p>
                )}
              </div>
              <Button
                variant="primary"
                size="sm"
                disabled={addingId === tpl.id}
                onClick={() => handleAdd(tpl.id)}
              >
                {addingId === tpl.id ? "Добавляю…" : "Добавить"}
              </Button>
            </div>
          ))
        )}
      </div>
    </ModalShell>
  );
}
