/**
 * GET /api/student/progress/history
 *
 * Returns time-series data for the student's progress charts (last 30 days):
 *  - attendance: minutes spent in the app per day
 *  - lessons:    cumulative completed lessons per day
 *  - hasanat:    cumulative hasanat balance per day
 *
 * Each series is a dense day-by-day array so the frontend charts render a
 * continuous line even on days without activity.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ActivityKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError } from "@/lib/errors";

const HISTORY_DAYS = 30;
const MAX_SESSION_MS = 4 * 60 * 60 * 1000; // safety cap per session

/** Local-time YYYY-MM-DD key for grouping by calendar day. */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sessionDurationMs(s: { startedAt: Date; lastSeenAt: Date; endedAt: Date | null }) {
  const end = s.endedAt ?? s.lastSeenAt;
  const ms = Math.max(0, end.getTime() - s.startedAt.getTime());
  return Math.min(ms, MAX_SESSION_MS);
}

export const GET = withErrorHandling(async (_req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Необходима авторизация");
  }
  if (session.user.role !== "STUDENT") {
    throw new ForbiddenError("Доступно только для студентов");
  }

  const userId = session.user.id;

  // Window start: midnight HISTORY_DAYS-1 days ago (inclusive of today).
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (HISTORY_DAYS - 1));

  // Build the dense list of day keys for the window.
  const days: string[] = [];
  for (let i = 0; i < HISTORY_DAYS; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(dayKey(d));
  }

  const [appSessions, completedLessons, hasanatTx, balanceNow] = await Promise.all([
    prisma.activitySession.findMany({
      where: { userId, kind: ActivityKind.APP, startedAt: { gte: start } },
      select: { startedAt: true, lastSeenAt: true, endedAt: true },
    }),
    prisma.lessonProgress.findMany({
      where: { userId, completed: true, completedAt: { not: null } },
      select: { completedAt: true },
      orderBy: { completedAt: "asc" },
    }),
    prisma.hasanatTransaction.findMany({
      where: { userId, createdAt: { gte: start } },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { hasanatBalance: true },
    }),
  ]);

  // ── Attendance: minutes per day ──────────────────────────────────────────
  const minutesByDay = new Map<string, number>();
  for (const s of appSessions) {
    const key = dayKey(s.startedAt);
    minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + sessionDurationMs(s) / 60000);
  }

  // ── Lessons: cumulative completed count per day ──────────────────────────
  // Count lessons completed before the window to seed the cumulative baseline.
  let lessonsBeforeWindow = 0;
  const lessonsCompletedInDay = new Map<string, number>();
  for (const l of completedLessons) {
    if (!l.completedAt) continue;
    if (l.completedAt < start) {
      lessonsBeforeWindow += 1;
    } else {
      const key = dayKey(l.completedAt);
      lessonsCompletedInDay.set(key, (lessonsCompletedInDay.get(key) ?? 0) + 1);
    }
  }

  // ── Hasanat: reconstruct cumulative balance per day ──────────────────────
  // We know the current balance; subtract transactions inside the window to
  // find the starting balance, then walk forward day by day.
  const hasanatInWindowTotal = hasanatTx.reduce((acc, t) => acc + t.amount, 0);
  const balanceAtStart = (balanceNow?.hasanatBalance ?? 0) - hasanatInWindowTotal;
  const hasanatByDay = new Map<string, number>();
  for (const t of hasanatTx) {
    const key = dayKey(t.createdAt);
    hasanatByDay.set(key, (hasanatByDay.get(key) ?? 0) + t.amount);
  }

  // ── Assemble dense series ────────────────────────────────────────────────
  let lessonsCumulative = lessonsBeforeWindow;
  let hasanatCumulative = balanceAtStart;

  const attendance: Array<{ date: string; minutes: number }> = [];
  const lessons: Array<{ date: string; completed: number }> = [];
  const hasanat: Array<{ date: string; balance: number; earned: number }> = [];

  for (const key of days) {
    attendance.push({
      date: key,
      minutes: Math.round(minutesByDay.get(key) ?? 0),
    });

    lessonsCumulative += lessonsCompletedInDay.get(key) ?? 0;
    lessons.push({ date: key, completed: lessonsCumulative });

    const earned = hasanatByDay.get(key) ?? 0;
    hasanatCumulative += earned;
    hasanat.push({
      date: key,
      balance: Math.max(0, hasanatCumulative),
      earned,
    });
  }

  return NextResponse.json({
    days: HISTORY_DAYS,
    attendance,
    lessons,
    hasanat,
  });
});
