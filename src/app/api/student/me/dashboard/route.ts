import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError } from "@/lib/errors";

/**
 * GET /api/student/me/dashboard
 * JSON version of src/app/student/page.tsx data — for mobile/API clients.
 */
export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new AuthError("Необходимо войти в систему");
  if (session.user.role !== "STUDENT") {
    throw new ForbiddenError("Только студенты имеют доступ");
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: session.user.id },
    include: {
      stream: {
        include: {
          course: { include: { teacher: { select: { name: true } } } },
          scheduleSlots: true,
          lessons: {
            where: { published: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const enrollmentIds = enrollments.map((e) => e.id);
  const streamIds = enrollments.map((e) => e.streamId);

  const assignments = await prisma.homeworkAssignment.findMany({
    where: { streamId: { in: streamIds } },
    include: {
      lesson: { select: { id: true, title: true } },
      submissions: {
        where: { enrollmentId: { in: enrollmentIds } },
        select: {
          id: true, status: true, grade: true, teacherComment: true,
          contentText: true, contentUrl: true,
          voiceMimeType: true, voiceDurationMs: true,
          submittedAt: true, checkedAt: true, enrollmentId: true,
        },
      },
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
  });

  const quizSubmissions = await prisma.lessonQuizSubmission.findMany({
    where: { studentId: session.user.id },
    select: {
      id: true, status: true, createdAt: true, checkedAt: true,
      quiz: {
        select: {
          id: true, title: true, type: true,
          lesson: { select: { id: true, title: true, streamId: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const enrollmentByStreamId = Object.fromEntries(
    enrollments.map((e) => [e.streamId, e]),
  );

  const serializedEnrollments = enrollments.map((e) => ({
    enrollmentId: e.id,
    status: e.status,
    stream: {
      id: e.stream.id,
      name: e.stream.name,
      level: e.stream.level,
      schedule: e.stream.schedule,
      courseName: e.stream.course.title,
      teacherName: e.stream.course.teacher.name,
      scheduleSlots: e.stream.scheduleSlots.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startMinutes: s.startMinutes,
        durationMinutes: s.durationMinutes,
      })),
      lessons: e.stream.lessons.map((l) => ({
        id: l.id, title: l.title, type: l.type, content: l.content,
      })),
    },
  }));

  const serializedAssignments = assignments.map((a) => {
    const enrollment = enrollmentByStreamId[a.streamId];
    const sub = enrollment
      ? a.submissions.find((s) => s.enrollmentId === enrollment.id) ?? null
      : null;
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      type: a.type,
      dueAt: a.dueAt ? a.dueAt.toISOString() : null,
      streamId: a.streamId,
      streamName: enrollment?.stream.name ?? "",
      lesson: a.lesson ? { id: a.lesson.id, title: a.lesson.title } : null,
      enrollmentId: enrollment?.id ?? null,
      submission: sub
        ? {
            id: sub.id,
            status: sub.status,
            grade: sub.grade,
            teacherComment: sub.teacherComment,
            contentText: sub.contentText,
            hasAudio: Boolean(sub.voiceMimeType),
            voiceDurationMs: sub.voiceDurationMs,
            audioUrl: sub.voiceMimeType
              ? `/api/teacher/homework/submissions/${sub.id}/audio`
              : null,
            submittedAt: sub.submittedAt.toISOString(),
            checkedAt: sub.checkedAt ? sub.checkedAt.toISOString() : null,
          }
        : null,
    };
  });

  const serializedQuizResults = quizSubmissions.map((qs) => ({
    id: qs.id,
    status: qs.status,
    createdAt: qs.createdAt.toISOString(),
    checkedAt: qs.checkedAt ? qs.checkedAt.toISOString() : null,
    quiz: {
      id: qs.quiz.id,
      title: qs.quiz.title,
      type: qs.quiz.type,
      lesson: {
        id: qs.quiz.lesson.id,
        title: qs.quiz.lesson.title,
        streamId: qs.quiz.lesson.streamId,
      },
    },
  }));

  return NextResponse.json({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
    enrollments: serializedEnrollments,
    homeworkAssignments: serializedAssignments,
    quizResults: serializedQuizResults,
  });
});
