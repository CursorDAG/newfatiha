import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  HomeworkSubmissionStatus,
  QuizSubmissionStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

export type GradebookLessonCellKind = "HOMEWORK" | "QUIZ";

export type GradebookHomeworkStatus =
  | HomeworkSubmissionStatus
  | "NOT_ASSIGNED"
  | "NO_SUBMISSION";

export type GradebookQuizStatus =
  | QuizSubmissionStatus
  | "NO_SUBMISSION";

export type GradebookLesson = {
  id: string;
  title: string;
  hasHomework: boolean;
  hasQuiz: boolean;
};

export type GradebookCell = {
  lessonId: string;
  homeworkStatus: GradebookHomeworkStatus | null;
  quizStatus: GradebookQuizStatus | null;
};

export type GradebookStudentRow = {
  enrollmentId: string;
  studentId: string;
  name: string;
  cells: GradebookCell[];
};

export type GradebookPayload = {
  stream: { id: string; name: string; courseTitle: string };
  lessons: GradebookLesson[];
  students: GradebookStudentRow[];
};

function bestQuizStatus(
  statuses: QuizSubmissionStatus[],
): QuizSubmissionStatus {
  if (statuses.includes("PASSED")) return "PASSED";
  if (statuses.includes("FAILED")) return "FAILED";
  return "SUBMITTED";
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
    include: {
      enrollments: {
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
      course: true,
      lessons: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!stream) {
    throw new NotFoundError("Stream");
  }
  if (session.user.role !== "ADMIN" && stream.teacherId !== session.user.id) {
    throw new ForbiddenError("You do not have permission to access this stream");
  }

  if (!stream.lessons.length || !stream.enrollments.length) {
    const emptyPayload: GradebookPayload = {
      stream: { id: stream.id, name: stream.name, courseTitle: stream.course.title },
      lessons: [],
      students: [],
    };
    return NextResponse.json(emptyPayload);
  }

  const lessonIds = stream.lessons.map((l) => l.id);

  const [assignments, homeworkSubmissions, quizzes, quizSubmissions] =
    await Promise.all([
      prisma.homeworkAssignment.findMany({
        where: { streamId, lessonId: { in: lessonIds } },
        select: { id: true, lessonId: true },
      }),
      prisma.homeworkSubmission.findMany({
        where: { assignment: { streamId, lessonId: { in: lessonIds } } },
        select: {
          assignmentId: true,
          enrollmentId: true,
          status: true,
        },
      }),
      prisma.lessonQuiz.findMany({
        where: { lessonId: { in: lessonIds } },
        select: { id: true, lessonId: true },
      }),
      prisma.lessonQuizSubmission.findMany({
        where: {
          quiz: { lessonId: { in: lessonIds } },
          studentId: { in: stream.enrollments.map((e) => e.userId) },
        },
        select: {
          quizId: true,
          studentId: true,
          status: true,
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

  const homeworkByAssignmentAndEnrollment = new Map<string, HomeworkSubmissionStatus>();
  for (const sub of homeworkSubmissions) {
    const key = `${sub.assignmentId}:${sub.enrollmentId}`;
    homeworkByAssignmentAndEnrollment.set(key, sub.status);
  }

  const quizzesByLesson = new Map<string, string[]>();
  for (const q of quizzes) {
    const arr = quizzesByLesson.get(q.lessonId) ?? [];
    arr.push(q.id);
    quizzesByLesson.set(q.lessonId, arr);
  }

  const quizStatusesByQuizAndStudent = new Map<string, QuizSubmissionStatus[]>();
  for (const sub of quizSubmissions) {
    const key = `${sub.quizId}:${sub.studentId}`;
    const arr = quizStatusesByQuizAndStudent.get(key) ?? [];
    arr.push(sub.status);
    quizStatusesByQuizAndStudent.set(key, arr);
  }

  const lessons: GradebookLesson[] = stream.lessons.map((l) => ({
    id: l.id,
    title: l.title,
    hasHomework: (assignmentsByLesson.get(l.id) ?? []).length > 0,
    hasQuiz: (quizzesByLesson.get(l.id) ?? []).length > 0,
  }));

  const students: GradebookStudentRow[] = stream.enrollments.map((e) => {
    const cells: GradebookCell[] = lessons.map((lesson) => {
      const assignmentIds = assignmentsByLesson.get(lesson.id) ?? [];
      const quizIds = quizzesByLesson.get(lesson.id) ?? [];

      let homeworkStatus: GradebookHomeworkStatus | null = null;
      if (assignmentIds.length === 0) {
        homeworkStatus = "NOT_ASSIGNED";
      } else {
        const statuses: HomeworkSubmissionStatus[] = [];
        for (const assignmentId of assignmentIds) {
          const key = `${assignmentId}:${e.id}`;
          const status = homeworkByAssignmentAndEnrollment.get(key);
          if (status) statuses.push(status);
        }
        if (!statuses.length) {
          homeworkStatus = "NO_SUBMISSION";
        } else if (statuses.includes("ACCEPTED")) {
          homeworkStatus = "ACCEPTED";
        } else if (statuses.includes("NEEDS_REWORK")) {
          homeworkStatus = "NEEDS_REWORK";
        } else if (statuses.includes("REJECTED")) {
          homeworkStatus = "REJECTED";
        } else {
          homeworkStatus = "SUBMITTED";
        }
      }

      let quizStatus: GradebookQuizStatus | null = null;
      if (quizIds.length) {
        const allStatuses: QuizSubmissionStatus[] = [];
        for (const quizId of quizIds) {
          const key = `${quizId}:${e.userId}`;
          const statuses = quizStatusesByQuizAndStudent.get(key);
          if (statuses && statuses.length) allStatuses.push(...statuses);
        }
        if (allStatuses.length) {
          quizStatus = bestQuizStatus(allStatuses);
        } else {
          quizStatus = "NO_SUBMISSION";
        }
      }

      return {
        lessonId: lesson.id,
        homeworkStatus,
        quizStatus,
      };
    });

    return {
      enrollmentId: e.id,
      studentId: e.userId,
      name: e.user.name,
      cells,
    };
  });

  const payload: GradebookPayload = {
    stream: { id: stream.id, name: stream.name, courseTitle: stream.course.title },
    lessons,
    students,
  };

  return NextResponse.json(payload);
});

