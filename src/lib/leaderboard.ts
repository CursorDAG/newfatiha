/**
 * Leaderboard service — computes and queries stream leaderboards.
 *
 * XP is accumulated from Hasanat transactions (per the rates in HASANAT_RATES).
 * Weekly Hasanat is the sum of transactions in the current week.
 * Streak is read from the User.streaks relation (STUDY type).
 */
import { prisma } from "@/lib/prisma";

export type LeaderboardEntryView = {
  userId: string;
  userName: string;
  avatar: string | null;
  xp: number;
  streak: number;
  weeklyHasanat: number;
  rank: number;
};

/** Get Monday (00:00 local) of the ISO week containing a date. */
export function weekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const isoDay = day === 0 ? 7 : day; // Mon=1 … Sun=7
  d.setDate(d.getDate() - isoDay + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Recompute (upsert) a single leaderboard entry for a user in a stream. */
async function upsertEntry(
  streamId: string,
  userId: string,
  ws: Date,
): Promise<void> {
  const [totalXp, streak, weekly] = await Promise.all([
    prisma.hasanatTransaction.aggregate({
      where: { userId },
      _sum: { amount: true },
    }),
    prisma.streak.findFirst({
      where: { userId, type: "STUDY" },
      select: { currentStreak: true },
    }),
    prisma.hasanatTransaction.aggregate({
      where: { userId, createdAt: { gte: ws } },
      _sum: { amount: true },
    }),
  ]);

  const xp = totalXp._sum.amount ?? 0;
  const streakVal = streak?.currentStreak ?? 0;
  const weeklyHasanat = weekly._sum.amount ?? 0;

  await prisma.leaderboardEntry.upsert({
    where: {
      streamId_userId_weekStart: { streamId, userId, weekStart: ws },
    },
    update: { xp, streak: streakVal, weeklyHasanat },
    create: { streamId, userId, xp, streak: streakVal, weeklyHasanat, weekStart: ws },
  });
}

/** Recompute the leaderboard for all active enrolled users in a stream. */
export async function recomputeLeaderboard(streamId: string): Promise<number> {
  const ws = weekStart();
  const enrollments = await prisma.enrollment.findMany({
    where: { streamId, status: "ACTIVE" },
    select: { userId: true },
  });

  for (const e of enrollments) {
    await upsertEntry(streamId, e.userId, ws);
  }

  // Assign ranks: highest xp first, tiebreak by weeklyHasanat desc.
  await prisma.$executeRaw`
    WITH ranked AS (
      SELECT id,
             ROW_NUMBER() OVER (ORDER BY xp DESC, "weeklyHasanat" DESC) AS rn
      FROM "LeaderboardEntry"
      WHERE "streamId" = ${streamId} AND "weekStart" = ${ws}
    )
    UPDATE "LeaderboardEntry" le
    SET "rank" = ranked.rn
    FROM ranked
    WHERE le.id = ranked.id
  `;

  return enrollments.length;
}

/** Get top N leaderboard entries for a stream this week. */
export async function getTopLeaderboard(
  streamId: string,
  topN: number = 10,
): Promise<LeaderboardEntryView[]> {
  const ws = weekStart();

  const entries = await prisma.leaderboardEntry.findMany({
    where: { streamId, weekStart: ws, rank: { lte: topN } },
    orderBy: { rank: "asc" },
    select: {
      userId: true,
      xp: true,
      streak: true,
      weeklyHasanat: true,
      rank: true,
      user: { select: { name: true, avatar: true } },
    },
  });

  return entries.map((e) => ({
    userId: e.userId,
    userName: e.user.name,
    avatar: e.user.avatar,
    xp: e.xp,
    streak: e.streak,
    weeklyHasanat: e.weeklyHasanat,
    rank: e.rank ?? 0,
  }));
}

/** Get the current user's rank in a stream this week (null if not ranked). */
export async function getUserRank(
  streamId: string,
  userId: string,
): Promise<number | null> {
  const entry = await prisma.leaderboardEntry.findFirst({
    where: { streamId, userId, weekStart: weekStart() },
    select: { rank: true },
  });
  return entry?.rank ?? null;
}
