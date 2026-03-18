"use client";

import React, { useMemo, useState } from "react";
import ModalShell from "@/components/teacher/ui/ModalShell";
import { Button } from "@/components/teacher/ui/Button";

type Lesson = {
  id: string;
  title: string;
  type: string;
  sortOrder: number;
};

type Stream = {
  id: string;
  name: string;
  level: string;
  lessons: Lesson[];
};

export default function ImportLessonsModal({
  streams,
  currentStreamId,
  onClose,
  onConfirm,
}: {
  streams: Stream[];
  currentStreamId: string;
  onClose: () => void;
  onConfirm: (fromStreamId: string, lessonIds: string[]) => void;
}) {
  const options = useMemo(
    () => streams.filter((s) => s.id !== currentStreamId),
    [streams, currentStreamId],
  );
  const [fromId, setFromId] = useState<string>(options[0]?.id ?? "");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleStreamChange = (newFromId: string) => {
    setFromId(newFromId);
    setSelectedIds(new Set()); // Clear selection when changing streams
  };

  const selectedStream = useMemo(
    () => options.find((s) => s.id === fromId),
    [options, fromId],
  );
  const sortedLessons = useMemo(
    () =>
      selectedStream
        ? [...selectedStream.lessons].sort(
            (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
          )
        : [],
    [selectedStream],
  );

  function toggleLesson(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(sortedLessons.map((l) => l.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  const allSelected =
    sortedLessons.length > 0 && selectedIds.size === sortedLessons.length;
  const someSelected = selectedIds.size > 0;

  return (
    <ModalShell
      title="Импорт уроков"
      subtitle="Выберите поток-источник и отметьте уроки для импорта."
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button
            variant="primary"
            disabled={!fromId || !someSelected}
            onClick={() =>
              fromId && onConfirm(fromId, Array.from(selectedIds))
            }
          >
            Импортировать ({selectedIds.size})
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">
            Поток-источник
          </label>
          <select
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none bg-slate-50 focus:bg-white"
            value={fromId}
            onChange={(e) => handleStreamChange(e.target.value)}
          >
            {options.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.level})
              </option>
            ))}
          </select>
        </div>

        {options.length === 0 && (
          <div className="text-sm text-slate-500">
            Нет других потоков для импорта.
          </div>
        )}

        {selectedStream && sortedLessons.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-slate-700">
                Уроки для импорта
              </label>
              <button
                type="button"
                onClick={() => toggleAll(!allSelected)}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {allSelected ? "Снять все" : "Выбрать все"}
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50 divide-y divide-slate-200">
              {sortedLessons.map((lesson) => (
                <label
                  key={lesson.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-100 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(lesson.id)}
                    onChange={() => toggleLesson(lesson.id)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-400"
                  />
                  <span className="text-slate-800 truncate">{lesson.title}</span>
                  <span className="text-xs text-slate-500 ml-auto shrink-0">
                    {lesson.type}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {selectedStream && sortedLessons.length === 0 && (
          <div className="text-sm text-slate-500">
            В выбранном потоке нет уроков.
          </div>
        )}
      </div>
    </ModalShell>
  );
}
