import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  HomeworkSubmissionStatus,
  QuizSubmissionStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { bestQuizStatusWithTimestamp } from "@/lib/quiz";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError } from "@/lib/errors";

export type StudentLessonProgress = {
  lessonId: string;
  lessonTitle: string;
  homeworkStatus: HomeworkSubmissionStatus | "NOT_ASSIGNED" | "NO_SUBMISSION" | null;
  homeworkSubmittedAt: Date | null;
  homeworkCheckedAt: Date | null;
  quizStatus: QuizSubmissionStatus | "NO_SUBMISSION" | null;
  quizLastSubmittedAt: Date | null;
};

export type StudentProgressPayload = {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  streamId: string;
  streamName: string;
  lessons: StudentLessonProgress[];
};

export const GET = withErrorHandling(async (
  _req: Request,
  context?: { params: Promise<Record<string, string>> },
) => {
  const params = await context!.params;
  const enrollmentId = params.enrollmentId;
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    throw new AuthError("Unauthorized");
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      user: true,
      stream: {
        include: {
          course: true,
          lessons: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!enrollment) {
    throw new NotFoundError("Enrollment");
  }

  if (session.user.role !== "ADMIN" && enrollment.stream.teacherId !== session.user.id) {
    throw new ForbiddenError("You do not have permission to access this enrollment");
  }

  const lessonIds = enrollment.stream.lessons.map((l) => l.id);

  const [assignments, homeworkSubmissions, quizSubmissions] = await Promise.all([
    prisma.homeworkAssignment.findMany({
      where: { streamId: enrollment.streamId, lessonId: { in: lessonIds } },
      select: { id: true, lessonId: true },
    }),
    prisma.homeworkSubmission.findMany({
      where: {
        enrollmentId: enrollment.id,
        assignment: { lessonId: { in: lessonIds } },
      },
      select: {
        assignmentId: true,
        status: true,
        submittedAt: true,
        checkedAt: true,
      },
    }),
    prisma.lessonQuizSubmission.findMany({
      where: {
        studentId: enrollment.userId,
        quiz: { lessonId: { in: lessonIds } },
      },
      select: {
        status: true,
        createdAt: true,
        quiz: {
          select: {
            id: true,
            lessonId: true,
          },
        },
      },
    }),
  ]);

  const assignmentsByLesson = new Map<string, string[]>();
  for (const a of assignments) {
    if (!a.lessonId) continue;
    const arr = assignmentsByLesson.get(a.lessonId) ?? [];
    arr.push(a.id);
    assignmentsByLesson.set(a.lessonId, arr);
  }

  const homeworkByAssignment = new Map<
    string,
    { status: HomeworkSubmissionStatus; submittedAt: Date; checkedAt: Date | null }
  >();
  for (const s of homeworkSubmissions) {
    homeworkByAssignment.set(s.assignmentId, {
      status: s.status,
      submittedAt: s.submittedAt,
      checkedAt: s.checkedAt,
    });
  }

  const quizByLesson = new Map<string, { status: QuizSubmissionStatus; createdAt: Date }[]>();
  for (const s of quizSubmissions) {
    const lessonId = s.quiz.lessonId;
    const arr = quizByLesson.get(lessonId) ?? [];
    arr.push({ status: s.status, createdAt: s.createdAt });
    quizByLesson.set(lessonId, arr);
  }

  const lessons: StudentLessonProgress[] = enrollment.stream.lessons.map((lesson) => {
    const assignmentIds = assignmentsByLesson.get(lesson.id) ?? [];
    let homeworkStatus: HomeworkSubmissionStatus | "NOT_ASSIGNED" | "NO_SUBMISSION" | null = null;
    let homeworkSubmittedAt: Date | null = null;
    let homeworkCheckedAt: Date | null = null;

    if (assignmentIds.length === 0) {
      homeworkStatus = "NOT_ASSIGNED";
    } else {
      const submissionsForLesson: {
        status: HomeworkSubmissionStatus;
        submittedAt: Date;
        checkedAt: Date | null;
      }[] = [];
      for (const assignmentId of assignmentIds) {
        const s = homeworkByAssignment.get(assignmentId);
        if (s) submissionsForLesson.push(s);
      }
      if (!submissionsForLesson.length) {
        homeworkStatus = "NO_SUBMISSION";
      } else {
        const accepted = submissionsForLesson.find((s) => s.status === "ACCEPTED");
        const needsRework = submissionsForLesson.find((s) => s.status === "NEEDS_REWORK");
        const rejected = submissionsForLesson.find((s) => s.status === "REJECTED");
        const submitted = submissionsForLesson.find((s) => s.status === "SUBMITTED");
        const chosen =
          accepted ?? needsRework ?? rejected ?? submitted ?? submissionsForLesson[0];
        homeworkStatus = chosen.status;
        homeworkSubmittedAt = chosen.submittedAt;
        homeworkCheckedAt = chosen.checkedAt;
      }
    }

    const quizSubs = quizByLesson.get(lesson.id) ?? [];
    let quizStatus: QuizSubmissionStatus | "NO_SUBMISSION" | null = null;
    let quizLastSubmittedAt: Date | null = null;

    if (quizSubs.length) {
      const best = bestQuizStatusWithTimestamp(quizSubs);
      quizStatus = best.status;
      quizLastSubmittedAt = best.createdAt;
    } else {
      quizStatus = "NO_SUBMISSION";
    }

    return {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      homeworkStatus,
      homeworkSubmittedAt,
      homeworkCheckedAt,
      quizStatus,
      quizLastSubmittedAt,
    };
  });

  const payload: StudentProgressPayload = {
    enrollmentId: enrollment.id,
    studentId: enrollment.userId,
    studentName: enrollment.user.name,
    streamId: enrollment.streamId,
    streamName: enrollment.stream.name,
    lessons,
  };

  return NextResponse.json(payload);
});

