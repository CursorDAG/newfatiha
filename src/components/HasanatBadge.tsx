/**
 * HasanatBadge — показывает баланс хасанатов пользователя.
 * Используется в StudentDashboard и TeacherDashboard.
 */
"use client";

import { Star } from "lucide-react";
import { useHasanat } from "@/components/HasanatProvider";

export default function HasanatBadge() {
  const { stats, loading, error } = useHasanat();

  if (loading) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center border border-amber-200 shrink-0">
            <Star className="w-5 h-5 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 opacity-70">
              Хасанат
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-800 leading-none animate-pulse">
              ...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats || error) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center border border-amber-200 shrink-0">
            <Star className="w-5 h-5 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 opacity-70">
              Хасанат
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-800 leading-none">
              {error || "0"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5 transition-all hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center border border-amber-200 shrink-0">
          <Star className="w-5 h-5 text-amber-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 opacity-70">
            Хасанат
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-800 leading-none">
            {stats.balance}
          </p>
        </div>
      </div>

      {stats.breakdown.length > 0 && (
        <div className="mt-3 pt-3 border-t border-amber-200/60">
          <p className="text-[10px] font-semibold text-amber-700 opacity-60 mb-2 uppercase tracking-wider">
            Источник дохода
          </p>
          <div className="space-y-1.5">
            {stats.breakdown.slice(0, 4).map((item) => (
              <div key={item.type} className="flex items-center justify-between text-xs">
                <span className="text-amber-700 font-medium">{item.label}</span>
                <span className="text-amber-800 font-bold">
                  {item.totalAmount} ({item.count})
                </span>
              </div>
            ))}
          </div>
          {stats.breakdown.length > 4 && (
            <p className="text-[10px] text-amber-600 font-semibold mt-1">
              +{stats.breakdown.length - 4} ещё…
            </p>
          )}
        </div>
      )}

      {stats.balance > 0 && (
        <p className="text-[10px] font-semibold mt-2 text-amber-700 opacity-60">
          Всего заработано: {stats.totalEarned}
        </p>
      )}
    </div>
  );
}
