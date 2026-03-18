"use client";

import React, { useCallback, useEffect, useState } from "react";
import ScheduleGrid, { type ScheduleSlot } from "@/components/ScheduleGrid";

export default function TeacherSchedulePage() {
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [hoveredInfo, setHoveredInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/teacher/schedule");
      const data = (await res.json()) as { slots?: ScheduleSlot[]; error?: string };
      if (!res.ok) throw new Error(data?.error ?? "Не удалось загрузить расписание");
      setSlots(data.slots ?? []);
    } catch (e: unknown) {
      setSlots([]);
      setError(e instanceof Error ? e.message : "Не удалось загрузить расписание");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-emerald-900">Расписание</h1>
              <p className="text-sm text-slate-500 mt-1">Недельный органайзер по всем группам</p>
              <p className="text-sm font-semibold text-slate-700 mt-2 min-h-[20px]">
                {hoveredInfo ? <span className="text-emerald-700">{hoveredInfo}</span> : <span className="opacity-0">—</span>}
              </p>
            </div>
            <button
              onClick={fetchSchedule}
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm"
            >
              Обновить
            </button>
          </div>

          <div className="p-6">
            {slots.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {Array.from(
                  new Map(
                    slots
                      .filter((s) => !!s.streamName)
                      .map((s) => [s.streamName, s.streamColor ?? "#10b981"] as const)
                  ).entries()
                ).map(([name, color]) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700"
                    title={name}
                  >
                    <span
                      className="inline-block w-3 h-3 rounded-full border border-slate-200"
                      style={{ backgroundColor: color }}
                    />
                    {name}
                  </span>
                ))}
              </div>
            )}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
                {error}
              </div>
            )}
            {loading && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center text-slate-500 font-semibold">
                Загрузка...
              </div>
            )}
            {!loading && slots.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-52 text-slate-400 border border-dashed border-slate-300 rounded-2xl bg-slate-50">
                <span className="text-5xl mb-4">🗓</span>
                <p className="text-lg font-medium">Пока нет занятий в расписании</p>
                <p className="text-sm mt-1">Откройте «Потоки» и добавьте слоты расписания</p>
              </div>
            ) : (
              !loading && <ScheduleGrid mode="view" occupiedSlots={slots} onHoverStream={setHoveredInfo} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

