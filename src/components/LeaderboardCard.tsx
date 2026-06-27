/**
 * LeaderboardCard.tsx — Top-10 leaderboard for a stream.
 *
 * Gold accents for top-3 (medals), glass-card styling, responsive layout.
 */
"use client";

import { Trophy, Flame } from "lucide-react";
import { useState, useCallback } from "react";

type LeaderboardEntry = {
  rank: number;
  userId: string;
  userName: string;
  avatar: string | null;
  xp: number;
  streak: number;
  weeklyHasanat: number;
};

type Props = {
  streamId: string;
  title?: string;
  className?: string;
  compact?: boolean;
};

function Medal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg" title="1 место">🥇</span>;
  if (rank === 2) return <span className="text-lg" title="2 место">🥈</span>;
  if (rank === 3) return <span className="text-lg" title="3 место">🥉</span>;
  return <span className="text-sm font-bold text-slate-400 w-6 text-center">{rank}</span>;
}

function EntryRow({ entry, isCurrentUser, isCompact }: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  isCompact: boolean;
}) {
  const isTop3 = entry.rank <= 3;

  return (
    <div
      className={[
        "flex items-center gap-3 rounded-xl p-3 transition-all",
        isCompact ? "py-2" : "py-3",
        isTop3
          ? "bg-gradient-to-r from-amber-50/80 to-yellow-50/60 border border-amber-200/70"
          : isCurrentUser
            ? "bg-emerald-50/80 border border-emerald-200/70"
            : "bg-white/60 border border-slate-200/50 hover:shadow-sm",
      ].join(" ")}
    >
      {/* Rank / Medal */}
      <div className={`w-8 shrink-0 text-center ${isTop3 ? "" : ""}`}>
        <Medal rank={entry.rank} />
      </div>

      {/* Avatar */}
      <div className="shrink-0">
        {entry.avatar ? (
          <img
            src={entry.avatar}
            alt=""
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
            {entry.userName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Name */}
      <div className="min-w-0 flex-1">
        <p
          className={[
            "truncate",
            isCompact ? "text-sm" : "text-sm",
            isTop3 ? "font-bold text-slate-900" : "font-semibold text-slate-700",
            isCurrentUser ? "text-emerald-800" : "",
          ].join(" ")}
        >
          {entry.userName}
          {isCurrentUser && " (вы)"}
        </p>
        {!isCompact && (
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px] text-slate-500 flex items-center gap-0.5">
              <Trophy className="w-3 h-3 text-amber-500" />
              {entry.xp.toLocaleString("ru-RU")} XP
            </span>
            <span className="text-[11px] text-slate-500 flex items-center gap-0.5">
              <Flame className="w-3 h-3 text-orange-500" />
              {entry.streak}
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-0.5">
              ✨ {entry.weeklyHasanat.toLocaleString("ru-RU")}
            </span>
          </div>
        )}
      </div>

      {/* Compact XP badge */}
      {isCompact && (
        <div className={`shrink-0 text-right ${isTop3 ? "text-amber-700" : "text-slate-500"}`}>
          <p className="text-xs font-bold">{entry.xp.toLocaleString("ru-RU")}</p>
          <p className="text-[10px] opacity-60">XP</p>
        </div>
      )}
    </div>
  );
}

export default function LeaderboardCard({
  streamId,
  title = "Лидеры потока",
  className = "",
  compact = false,
}: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/leaderboard/${streamId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Ошибка загрузки");
      setEntries(data.entries ?? []);
      setMyRank(data.myRank ?? null);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, [streamId]);

  if (loading) {
    return (
      <div className={`rounded-2xl border border-slate-200 bg-white p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-32 bg-slate-200 rounded" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-2xl border border-slate-200 bg-white p-4 ${className}`}>
        <p className="text-sm text-red-600">Ошибка: {error}</p>
        <button
          onClick={refresh}
          className="text-xs text-emerald-600 underline mt-1"
        >
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <button
          onClick={refresh}
          className="text-xs text-slate-500 hover:text-emerald-600 transition-colors"
        >
          Обновить
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">
          Пока нет участников
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <EntryRow
              key={e.userId}
              entry={e}
              isCurrentUser={myRank !== null && e.rank === myRank}
              isCompact={compact}
            />
          ))}
        </div>
      )}
    </div>
  );
}
