"use client";

import React, { useMemo, useRef, useState } from "react";

export type ScheduleSlot = {
  streamId: string;
  streamName: string;
  streamColor?: string;
  dayOfWeek: number; // 0..6 (Sun..Sat)
  startMinutes: number;
  durationMinutes: number;
};

export type SlotInput = {
  dayOfWeek: number;
  startMinutes: number;
  durationMinutes: number;
};

type Props = {
  mode: "edit" | "view";
  stepMinutes?: 30;
  startHour?: number; // inclusive
  endHour?: number; // exclusive
  occupiedSlots: ScheduleSlot[]; // other streams (and/or all streams in view mode)
  selectedSlots?: SlotInput[]; // current stream slots (edit mode)
  onChangeSelectedSlots?: (next: SlotInput[]) => void;
  currentStreamId?: string; // to treat its own occupied slots as selectable when editing
  onHoverStream?: (streamName: string | null) => void;
};

function toTime(m: number) {
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const expanded =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function inInterval(cellStart: number, slotStart: number, slotDuration: number) {
  const slotEnd = slotStart + slotDuration;
  return cellStart >= slotStart && cellStart < slotEnd;
}

function overlaps(a: SlotInput, b: SlotInput) {
  if (a.dayOfWeek !== b.dayOfWeek) return false;
  const aEnd = a.startMinutes + a.durationMinutes;
  const bEnd = b.startMinutes + b.durationMinutes;
  return a.startMinutes < bEnd && b.startMinutes < aEnd;
}

export default function ScheduleGrid({
  mode,
  startHour = 6,
  endHour = 22,
  occupiedSlots,
  selectedSlots = [],
  onChangeSelectedSlots,
  currentStreamId,
  onHoverStream,
}: Props) {
  const stepMinutes = 30 as const;
  const [pending, setPending] = useState<{ dayOfWeek: number; startMinutes: number } | null>(null);
  const clearHoverTimerRef = useRef<number | null>(null);

  const dayLabels = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const days = useMemo(() => [1, 2, 3, 4, 5, 6, 0], []); // start from Mon for UX, Sunday last

  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;
  const columns = Math.floor((endMinutes - startMinutes) / stepMinutes);

  const occupiedCells = useMemo(() => {
    const occupied = new Map<
      string,
      { streamName: string; streamColor?: string; slotStart: number; slotEnd: number }
    >();
    for (const s of occupiedSlots) {
      if (mode === "edit" && currentStreamId && s.streamId === currentStreamId) continue;
      const slotStart = s.startMinutes;
      const slotEnd = s.startMinutes + s.durationMinutes;
      for (let m = slotStart; m < slotEnd; m += stepMinutes) {
        occupied.set(`${s.dayOfWeek}:${m}`, {
          streamName: s.streamName,
          streamColor: s.streamColor,
          slotStart,
          slotEnd,
        });
      }
    }
    return occupied;
  }, [occupiedSlots, mode, currentStreamId]);

  const selectedCells = useMemo(() => {
    const map = new Map<string, true>();
    for (const s of selectedSlots) {
      for (let m = s.startMinutes; m < s.startMinutes + s.durationMinutes; m += stepMinutes) {
        map.set(`${s.dayOfWeek}:${m}`, true);
      }
    }
    return map;
  }, [selectedSlots]);

  const handleCellClick = (dayOfWeek: number, cellStartMinutes: number) => {
    if (mode !== "edit" || !onChangeSelectedSlots) return;

    const occupied = occupiedCells.get(`${dayOfWeek}:${cellStartMinutes}`);
    if (occupied) return;

    // if clicking an existing selected slot cell -> remove the whole slot
    const idx = selectedSlots.findIndex((s) =>
      s.dayOfWeek === dayOfWeek && inInterval(cellStartMinutes, s.startMinutes, s.durationMinutes)
    );
    if (idx !== -1) {
      const next = selectedSlots.filter((_, i) => i !== idx);
      onChangeSelectedSlots(next);
      setPending(null);
      return;
    }

    setPending({ dayOfWeek, startMinutes: cellStartMinutes });
  };

  const addPendingWithDuration = (durationMinutes: number) => {
    if (!pending || mode !== "edit" || !onChangeSelectedSlots) return;
    const candidate: SlotInput = {
      dayOfWeek: pending.dayOfWeek,
      startMinutes: pending.startMinutes,
      durationMinutes,
    };

    // must stay inside grid window
    if (candidate.startMinutes < startMinutes || candidate.startMinutes + candidate.durationMinutes > endMinutes) {
      return;
    }

    // must not overlap blocked cells
    for (let m = candidate.startMinutes; m < candidate.startMinutes + candidate.durationMinutes; m += stepMinutes) {
      if (occupiedCells.get(`${candidate.dayOfWeek}:${m}`)) return;
    }

    // must not overlap own selected
    for (const s of selectedSlots) {
      if (overlaps(candidate, s)) return;
    }

    onChangeSelectedSlots([...selectedSlots, candidate]);
    setPending(null);
  };

  const setHoverInfo = (info: string | null) => {
    if (!onHoverStream) return;
    if (clearHoverTimerRef.current) {
      window.clearTimeout(clearHoverTimerRef.current);
      clearHoverTimerRef.current = null;
    }
    onHoverStream(info);
  };

  const scheduleClearHover = () => {
    if (!onHoverStream) return;
    if (clearHoverTimerRef.current) window.clearTimeout(clearHoverTimerRef.current);
    clearHoverTimerRef.current = window.setTimeout(() => {
      onHoverStream(null);
      clearHoverTimerRef.current = null;
    }, 80);
  };

  return (
    <div className="w-full">
      <div className="text-xs text-slate-600 mb-3">
        <span className="font-bold text-slate-700">Шаг:</span> 30 минут.{" "}
        {mode === "edit" ? (
          <>
            Клик по пустой ячейке → выберите длительность. Клик по зелёной зоне → удалить слот.
          </>
        ) : (
          <>Это общий календарь занятий по всем потокам.</>
        )}
      </div>

      <div
        className="overflow-auto border border-slate-200 rounded-2xl bg-white"
        onMouseLeave={() => setHoverInfo(null)}
      >
        <div
          className="min-w-[900px]"
          style={{
            display: "grid",
            gridTemplateColumns: `120px repeat(${columns}, minmax(28px, 1fr))`,
          }}
        >
          <div className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200 p-3 text-xs font-bold text-slate-600">
            День
          </div>
          {Array.from({ length: columns }).map((_, i) => {
            const t = startMinutes + i * stepMinutes;
            const label = t % 60 === 0 ? toTime(t) : "";
            return (
              <div
                key={`h-${i}`}
                className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200 p-2 text-[10px] font-bold text-slate-500 text-center"
              >
                {label}
              </div>
            );
          })}

          {days.map((dayOfWeek) => (
            <React.Fragment key={`d-${dayOfWeek}`}>
              <div className="border-b border-slate-100 p-3 text-sm font-bold text-slate-700 bg-slate-50/60">
                {dayLabels[dayOfWeek]}
              </div>
              {Array.from({ length: columns }).map((_, i) => {
                const cellStart = startMinutes + i * stepMinutes;
                const occupied = occupiedCells.get(`${dayOfWeek}:${cellStart}`);
                const selected = selectedCells.get(`${dayOfWeek}:${cellStart}`);
                const isPending =
                  pending?.dayOfWeek === dayOfWeek && pending?.startMinutes === cellStart;
                const cls = occupied
                  ? "bg-slate-200/70 cursor-not-allowed"
                  : selected
                    ? "bg-emerald-200/80 cursor-pointer"
                    : isPending
                      ? "bg-emerald-50 cursor-pointer"
                      : mode === "edit"
                        ? "bg-white hover:bg-slate-50 cursor-pointer"
                        : "bg-white";
                const baseClasses =
                  "border-b border-slate-100 border-l border-slate-100 h-8 transition-[opacity,box-shadow] duration-150";

                const style: React.CSSProperties = {};
                if (occupied?.streamColor) {
                  // view mode: full colour at high alpha; edit mode: lower alpha to signal "blocked"
                  const alpha = mode === "view" ? 0.75 : 0.45;
                  style.backgroundColor = hexToRgba(occupied.streamColor, alpha);
                }

                const dayName = dayLabels[dayOfWeek];
                const timeLabel = occupied
                  ? `${dayName} ${toTime(occupied.slotStart)}–${toTime(occupied.slotEnd)}`
                  : `${dayName} ${toTime(cellStart)}`;

                const title = occupied
                  ? `Группа: ${occupied.streamName} • ${timeLabel}`
                  : selected
                    ? "Выбрано (клик — удалить)"
                    : mode === "edit"
                      ? "Клик — выбрать"
                      : "";

                if (mode === "view") {
                  return (
                    <div
                      key={`c-${dayOfWeek}-${cellStart}`}
                      title={title}
                      onMouseEnter={() =>
                        occupied &&
                        onHoverStream &&
                        setHoverInfo(`Группа: ${occupied.streamName} • ${timeLabel}`)
                      }
                      onMouseLeave={() => scheduleClearHover()}
                      className={`${baseClasses} ${
                        occupied
                          ? "cursor-help hover:brightness-90 hover:shadow-[inset_0_0_0_2px_rgba(15,23,42,0.15)]"
                          : "bg-white"
                      }`}
                      style={style}
                    />
                  );
                }

                return (
                  <button
                    key={`c-${dayOfWeek}-${cellStart}`}
                    type="button"
                    title={title}
                    disabled={!!occupied}
                    onClick={() => handleCellClick(dayOfWeek, cellStart)}
                    className={`${baseClasses} ${cls}`}
                    style={style}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {mode === "edit" && pending && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm font-semibold text-slate-700">
            Выбрано начало:{" "}
            <span className="font-extrabold text-slate-900">
              {dayLabels[pending.dayOfWeek]} {toTime(pending.startMinutes)}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[30, 60, 90, 120, 150, 180].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => addPendingWithDuration(d)}
                className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold"
              >
                {d} мин
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPending(null)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

