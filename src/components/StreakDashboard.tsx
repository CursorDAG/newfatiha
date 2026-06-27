/**
 * StreakDashboard — client component that fetches streaks via API and renders badges.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Flame, BookOpen, BookMarked, Heart } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type StreakType = "STUDY" | "READING" | "HASANAT";

type Streak = {
  id: string;
  type: StreakType;
  currentStreak: number;
  maxStreak: number;
  lastActiveDate: string;
};

const TYPE_CONFIG: Record<StreakType, { label: string; icon: typeof Flame; colors: { bg: string; text: string; border: string; flame: string } }> = {
  STUDY: {
    label: "Учёба",
    icon: BookOpen,
    colors: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", flame: "text-amber-500" },
  },
  READING: {
    label: "Чтение",
    icon: BookMarked,
    colors: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", flame: "text-emerald-500" },
  },
  HASANAT: {
    label: "Хасанат",
    icon: Heart,
    colors: { bg: "bg-violet-50", text: "text-violet-800", border: "border-violet-200", flame: "text-violet-500" },
  },
};

// ── Badge ─────────────────────────────────────────────────────────────────────

function StreakBadge({ streak, onCheckIn }: { streak: Streak; onCheckIn?: () => void }) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const config = TYPE_CONFIG[streak.type];
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

  const Icon = config.icon;

  return (
    <div className={`rounded-2xl border ${config.colors.border} ${config.colors.bg} p-4 sm:p-5 transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${config.colors.border} border`}>
            <Icon className={`w-5 h-5 ${config.colors.flame} transition-transform ${isHot ? "animate-bounce scale-125" : ""}`} />
          </div>
          <div className="min-w-0">
            <p className={`text-[11px] font-bold uppercase tracking-wider ${config.colors.text} opacity-70`}>
              {config.label}
            </p>
            <p className={`text-2xl sm:text-3xl font-extrabold leading-none ${config.colors.text}`}>
              {streak.currentStreak}
            </p>
          </div>
        </div>
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
              {streak.currentStreak === 0 ? "Отметить" : "Проверено"}
            </button>
          )}
        </div>
      </div>
      {streak.maxStreak > 1 && (
        <p className={`text-[10px] font-semibold mt-2 ${config.colors.text} opacity-60`}>
          Рекорд: {streak.maxStreak} дн.
        </p>
      )}
      {error && <p className="text-xs text-red-600 mt-2 font-semibold">{error}</p>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function StreakDashboard({ userId, onCheckIn }: { userId: string; onCheckIn?: () => void }) {
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/streak/${userId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success) setStreaks(data.streaks);
      } catch { /* silent */ } finally { setLoading(false); }
    })();
  }, [userId]);

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  if (!streaks.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
      {streaks.map((s) => (
        <StreakBadge key={s.id} streak={s} onCheckIn={onCheckIn} />
      ))}
    </div>
  );
}
