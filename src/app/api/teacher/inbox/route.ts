import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError } from "@/lib/errors";

export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new AuthError("Необходимо войти в систему");
  if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
    throw new ForbiddenError("Только для учителей");
  }
  const teacherId = session.user.id;

  const [applications, homeworkSubs, quizSubs] = await Promise.all([
    prisma.enrollmentRequest.findMany({
      where: {
        status: "PENDING_REVIEW",
        stream: { course: { teacherId } },
      },
      include: {
        student: { select: { id: true, name: true, email: true } },
        stream: { select: { id: true, name: true, course: { select: { title: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.homeworkSubmission.findMany({
      where: {
        status: { in: ["SUBMITTED", "NEEDS_REWORK"] },
        assignment: { stream: { course: { teacherId } } },
      },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            type: true,
            stream: { select: { id: true, name: true } },
          },
        },
        enrollment: {
          select: { user: { select: { id: true, name: true } } },
        },
      },
      orderBy: { submittedAt: "desc" },
      take: 20,
    }),
    prisma.lessonQuizSubmission.findMany({
      where: {
        status: "SUBMITTED",
        quiz: { lesson: { stream: { course: { teacherId } } } },
      },
      include: {
        student: { select: { id: true, name: true } },
        quiz: {
          select: {
            id: true,
            title: true,
            type: true,
            lesson: { select: { id: true, title: true, stream: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return NextResponse.json({
    applications: applications.map((r) => ({
      id: r.id,
      studentName: r.student.name,
      studentEmail: r.student.email,
      streamId: r.stream.id,
      streamName: r.stream.name,
      courseTitle: r.stream.course.title,
      createdAt: r.createdAt.toISOString(),
    })),
    homework: homeworkSubs.map((s) => ({
      id: s.id,
      assignmentId: s.assignment.id,
      assignmentTitle: s.assignment.title,
      type: s.assignment.type,
      studentName: s.enrollment.user.name,
      streamId: s.assignment.stream.id,
      streamName: s.assignment.stream.name,
      submittedAt: s.submittedAt.toISOString(),
      status: s.status,
    })),
    quizzes: quizSubs.map((s) => ({
      id: s.id,
      quizId: s.quiz.id,
      quizTitle: s.quiz.title,
      type: s.quiz.type,
      lessonId: s.quiz.lesson.id,
      lessonTitle: s.quiz.lesson.title,
      streamId: s.quiz.lesson.stream.id,
      streamName: s.quiz.lesson.stream.name,
      studentName: s.student.name,
      submittedAt: s.createdAt.toISOString(),
    })),
  });
});
