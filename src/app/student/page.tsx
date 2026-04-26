import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import StudentDashboard from "@/components/StudentDashboard";
import { getJitsiConfig } from "@/lib/jitsi-jwt";

export default async function StudentPage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/api/auth/signin");
  if (session.user.role === "TEACHER" || session.user.role === "ADMIN")
    redirect("/teacher");

  // Fetch enrollments with fully ordered, published-only lessons
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

  // Fetch homework assignments for all streams the student is enrolled in
  const enrollmentIds = enrollments.map((e) => e.id);
  const streamIds = enrollments.map((e) => e.streamId);

  const assignments = await prisma.homeworkAssignment.findMany({
    where: { streamId: { in: streamIds } },
    include: {
      lesson: { select: { id: true, title: true } },
      submissions: { where: { enrollmentId: { in: enrollmentIds } } },
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
  });

  // Fetch quiz submissions for this student
  const quizSubmissions = await prisma.lessonQuizSubmission.findMany({
    where: { studentId: session.user.id },
    include: {
      quiz: {
        include: {
          lesson: {
            select: { id: true, title: true, streamId: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Build a map from streamId → enrollment for quick lookup
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
        id: l.id,
        title: l.title,
        type: l.type,
        content: l.content,
      })),
    },
  }));

  const serializedAssignments = assignments.map((a) => {
    const enrollment = enrollmentByStreamId[a.streamId];
    const sub = enrollment ? a.submissions.find((s) => s.enrollmentId === enrollment.id) ?? null : null;
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      type: a.type as "TEXT" | "AUDIO",
      dueAt: a.dueAt ? a.dueAt.toISOString() : null,
      streamId: a.streamId,
      streamName: enrollment?.stream.name ?? "",
      lesson: a.lesson ? { id: a.lesson.id, title: a.lesson.title } : null,
      enrollmentId: enrollment?.id ?? null,
      submission: sub
        ? {
            id: sub.id,
            status: sub.status as "SUBMITTED" | "ACCEPTED" | "NEEDS_REWORK" | "REJECTED",
            grade: sub.grade,
            teacherComment: sub.teacherComment,
            contentText: sub.contentText,
            submittedAt: sub.submittedAt.toISOString(),
            checkedAt: sub.checkedAt ? sub.checkedAt.toISOString() : null,
          }
        : null,
    };
  });

  const serializedQuizResults = quizSubmissions.map((qs) => ({
    id: qs.id,
    status: qs.status as "SUBMITTED" | "PASSED" | "FAILED",
    createdAt: qs.createdAt.toISOString(),
    checkedAt: qs.checkedAt ? qs.checkedAt.toISOString() : null,
    quiz: {
      id: qs.quiz.id,
      title: qs.quiz.title,
      type: qs.quiz.type as "MULTIPLE_CHOICE" | "VOICE",
      lesson: {
        id: qs.quiz.lesson.id,
        title: qs.quiz.lesson.title,
        streamId: qs.quiz.lesson.streamId,
      },
    },
  }));

  // Get Jitsi configuration
  const jitsiConfig = await getJitsiConfig()
  const jitsiDomain = jitsiConfig?.domain ?? "meet.jit.si"

  return (
    <StudentDashboard
      userName={session.user.name ?? "Студент"}
      userId={session.user.id}
      userEmail={session.user.email ?? ""}
      enrollments={serializedEnrollments}
      homeworkAssignments={serializedAssignments}
      quizResults={serializedQuizResults}
      jitsiDomain={jitsiDomain}
    />
  );
}
