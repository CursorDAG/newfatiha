/**
 * GET /api/teacher/analytics/trend?streamId=...
 *
 * Returns time-series trend data for a stream over the last 30 days, used by
 * the teacher "Аналитика" charts:
 *  - attendance:  total LIVE minutes across all students per day
 *  - submissions: quiz submissions per day (submitted / passed / failed)
 *
 * Days are returned as a dense array so charts render a continuous line.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ActivityKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

const HISTORY_DAYS = 30;
const MAX_SESSION_MS = 4 * 60 * 60 * 1000;

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

export const GET = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    throw new AuthError("Unauthorized");
  }

  const url = new URL(req.url);
  const streamId = url.searchParams.get("streamId");
  if (!streamId) {
    throw new ValidationError("streamId is required", { streamId: "Stream ID is required" });
  }

  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    include: { enrollments: { select: { userId: true } } },
  });

  if (!stream) throw new NotFoundError("Stream");
  if (session.user.role !== "ADMIN" && stream.teacherId !== session.user.id) {
    throw new ForbiddenError("You do not have permission to access this stream");
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (HISTORY_DAYS - 1));

  const days: string[] = [];
  for (let i = 0; i < HISTORY_DAYS; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(dayKey(d));
  }

  const studentIds = stream.enrollments.map((e) => e.userId);

  const [liveSessions, submissions] = await Promise.all([
    prisma.activitySession.findMany({
      where: {
        userId: { in: studentIds },
        kind: ActivityKind.LIVE_ROOM,
        streamId,
        startedAt: { gte: start },
      },
      select: { startedAt: true, lastSeenAt: true, endedAt: true },
    }),
    prisma.lessonQuizSubmission.findMany({
      where: {
        studentId: { in: studentIds },
        createdAt: { gte: start },
        quiz: { lesson: { streamId } },
      },
      select: { status: true, createdAt: true },
    }),
  ]);

  // ── Attendance: total LIVE minutes per day ───────────────────────────────
  const liveMinutesByDay = new Map<string, number>();
  for (const s of liveSessions) {
    const key = dayKey(s.startedAt);
    liveMinutesByDay.set(key, (liveMinutesByDay.get(key) ?? 0) + sessionDurationMs(s) / 60000);
  }

  // ── Submissions per day, split by status ─────────────────────────────────
  type DayCounts = { submitted: number; passed: number; failed: number };
  const subsByDay = new Map<string, DayCounts>();
  for (const sub of submissions) {
    const key = dayKey(sub.createdAt);
    const c = subsByDay.get(key) ?? { submitted: 0, passed: 0, failed: 0 };
    c.submitted += 1;
    if (sub.status === "PASSED") c.passed += 1;
    else if (sub.status === "FAILED") c.failed += 1;
    subsByDay.set(key, c);
  }

  const attendance = days.map((key) => ({
    date: key,
    minutes: Math.round(liveMinutesByDay.get(key) ?? 0),
  }));

  const submissionsSeries = days.map((key) => {
    const c = subsByDay.get(key) ?? { submitted: 0, passed: 0, failed: 0 };
    return { date: key, ...c };
  });

  return NextResponse.json({
    stream: { id: stream.id, name: stream.name },
    days: HISTORY_DAYS,
    studentCount: studentIds.length,
    attendance,
    submissions: submissionsSeries,
  });
});
