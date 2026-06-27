/**
 * StreakBadge — показывает текущий стрик с иконкой огня и кнопкой checkin.
 * Используется в StudentDashboard и TeacherDashboard.
 */
"use client";

import { useState, useCallback } from "react";
import { Flame, CheckCircle2, Loader2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type StreakType = "STUDY" | "READING" | "HASANAT";

type Streak = {
  id: string;
  type: StreakType;
  currentStreak: number;
  maxStreak: number;
  lastActiveDate: string;
};

const TYPE_LABELS: Record<StreakType, string> = {
  STUDY: "Учёба",
  READING: "Чтение",
  HASANAT: "Хасанат",
};

const TYPE_COLORS: Record<StreakType, { bg: string; text: string; flame: string; border: string }> = {
  STUDY: { bg: "bg-amber-50", text: "text-amber-800", flame: "text-amber-500", border: "border-amber-200" },
  READING: { bg: "bg-emerald-50", text: "text-emerald-800", flame: "text-emerald-500", border: "border-emerald-200" },
  HASANAT: { bg: "bg-violet-50", text: "text-violet-800", flame: "text-violet-500", border: "border-violet-200" },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function StreakBadge({
  streak,
  onCheckIn,
}: {
  streak: Streak;
  onCheckIn?: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const colors = TYPE_COLORS[streak.type];
  const isHot = streak.currentStreak >= 7;

  const handleCheckIn = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    setError("");
    try {
      const res = await fetch("/api/streak/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: streak.type }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Ошибка");
      }
      onCheckIn?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setChecking(false);
    }
  }, [checking, streak.type, onCheckIn]);

  return (
    <div
      className={`rounded-2xl border ${colors.border} ${colors.bg} p-4 sm:p-5 transition-all hover:shadow-md`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: icon + label */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colors.bg} border ${colors.border}`}>
            <Flame
              className={`w-5 h-5 transition-transform ${isHot ? "animate-bounce scale-125" : ""}`}
              style={isHot ? { color: "#f59e0b" } : {}}
            />
          </div>
          <div className="min-w-0">
            <p className={`text-[11px] font-bold uppercase tracking-wider ${colors.text} opacity-70`}>
              {TYPE_LABELS[streak.type]}
            </p>
            <p className={`text-2xl sm:text-3xl font-extrabold leading-none ${colors.text}`}>
              {streak.currentStreak}
            </p>
          </div>
        </div>

        {/* Right: check-in button */}
        <div className="shrink-0">
          {checking ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          ) : (
            <button
              onClick={handleCheckIn}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all ${
                streak.currentStreak === 0
                  ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                  : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
              }`}
              disabled={checking}
            >
              <CheckCircle2 className="w-4 h-4" />
              {streak.currentStreak === 0 ? "Отметить" : "Проверено"}
            </button>
          )}
        </div>
      </div>

      {/* Max streak */}
      {streak.maxStreak > 1 && (
        <p className={`text-[10px] font-semibold mt-2 ${colors.text} opacity-60`}>
          Рекорд: {streak.maxStreak} дн.
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 mt-2 font-semibold">{error}</p>
      )}
    </div>
  );
}
