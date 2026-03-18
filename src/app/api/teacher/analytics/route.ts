import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ActivityKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const RETENTION_DAYS = 30;
const MAX_SESSION_MS = 4 * 60 * 60 * 1000; // safety cap per session

function cutoff() {
  return new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Cleans up old activity tracking rows only.
 * LessonQuizSubmission is NOT purged here — it is assessment data that must be
 * retained indefinitely for the gradebook and student-progress features.
 */
async function purgeOldActivitySessions() {
  const c = cutoff();
  await prisma.activitySession.deleteMany({ where: { startedAt: { lt: c } } });
}

function sessionDurationMs(s: { startedAt: Date; lastSeenAt: Date; endedAt: Date | null }) {
  const end = s.endedAt ?? s.lastSeenAt;
  const ms = Math.max(0, end.getTime() - s.startedAt.getTime());
  return Math.min(ms, MAX_SESSION_MS);
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await purgeOldActivitySessions();

  const url = new URL(req.url);
  const streamId = url.searchParams.get("streamId");
  if (!streamId) return NextResponse.json({ error: "streamId is required" }, { status: 400 });

  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    include: {
      enrollments: {
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
      course: true,
    },
  });

  if (!stream) return NextResponse.json({ error: "Stream not found" }, { status: 404 });
  if (session.user.role !== "ADMIN" && stream.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const c = cutoff();
  const studentIds = stream.enrollments.map((e) => e.userId);

  const [appSessions, liveSessions, lessonSessions, submissions] = await Promise.all([
    prisma.activitySession.findMany({
      where: { userId: { in: studentIds }, kind: ActivityKind.APP, startedAt: { gte: c } },
      select: { userId: true, startedAt: true, lastSeenAt: true, endedAt: true },
      orderBy: { startedAt: "desc" },
    }),
    prisma.activitySession.findMany({
      where: { userId: { in: studentIds }, kind: ActivityKind.LIVE_ROOM, streamId, startedAt: { gte: c } },
      select: { userId: true, startedAt: true, lastSeenAt: true, endedAt: true },
      orderBy: { startedAt: "desc" },
    }),
    prisma.activitySession.findMany({
      where: { userId: { in: studentIds }, kind: ActivityKind.LESSON, streamId, startedAt: { gte: c } },
      select: { userId: true, startedAt: true, lastSeenAt: true, endedAt: true },
      orderBy: { startedAt: "desc" },
    }),
    prisma.lessonQuizSubmission.findMany({
      where: {
        studentId: { in: studentIds },
        createdAt: { gte: c },
        quiz: { lesson: { streamId } },
      },
      include: {
        quiz: { include: { lesson: true } },
        checkedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const groupSessions = (rows: typeof appSessions) => {
    const m = new Map<string, typeof rows>();
    for (const r of rows) {
      const arr = m.get(r.userId) ?? [];
      arr.push(r);
      m.set(r.userId, arr);
    }
    return m;
  };

  const appByUser = groupSessions(appSessions);
  const liveByUser = groupSessions(liveSessions);
  const lessonByUser = groupSessions(lessonSessions);

  const submissionsByUser = new Map<string, typeof submissions>();
  for (const s of submissions) {
    const arr = submissionsByUser.get(s.studentId) ?? [];
    arr.push(s);
    submissionsByUser.set(s.studentId, arr);
  }

  const students = stream.enrollments.map((e) => {
    const app = appByUser.get(e.userId) ?? [];
    const live = liveByUser.get(e.userId) ?? [];
    const lessons = lessonByUser.get(e.userId) ?? [];
    const subs = submissionsByUser.get(e.userId) ?? [];

    const lastLoginAt = app.length ? new Date(Math.max(...app.map((x) => x.lastSeenAt.getTime()))) : null;
    const appMs = app.reduce((acc, s) => acc + sessionDurationMs(s), 0);
    const liveMs = live.reduce((acc, s) => acc + sessionDurationMs(s), 0);
    const lessonMs = lessons.reduce((acc, s) => acc + sessionDurationMs(s), 0);

    const submittedCount = subs.length;
    const passedCount = subs.filter((x) => x.status === "PASSED").length;
    const failedCount = subs.filter((x) => x.status === "FAILED").length;
    const pendingCount = subs.filter((x) => x.status === "SUBMITTED").length;

    return {
      enrollmentId: e.id,
      studentId: e.userId,
      name: e.user.name,
      status: e.status,
      lastLoginAt,
      timeSpentMinutes: Math.round(appMs / 60000),
      liveMinutes: Math.round(liveMs / 60000),
      lessonMinutes: Math.round(lessonMs / 60000),
      submissions: {
        submittedCount,
        passedCount,
        failedCount,
        pendingCount,
      },
      recentSubmissions: subs.slice(0, 10).map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        status: s.status,
        quizTitle: s.quiz.title,
        quizType: s.quiz.type,
        lessonTitle: s.quiz.lesson.title,
        hasVoice: Boolean(s.voiceData && s.voiceMimeType),
        checkedAt: s.checkedAt,
        checkedByName: s.checkedBy?.name ?? null,
      })),
    };
  });

  return NextResponse.json({
    stream: { id: stream.id, name: stream.name, courseTitle: stream.course.title },
    retentionDays: RETENTION_DAYS,
    students,
  });
}

