/**
 * GET /api/student/progress/[streamId]
 * Get detailed progress for a specific stream
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError } from "@/lib/errors";

export const GET = withErrorHandling(
  async (req: Request, context?: { params: Promise<Record<string, string>> }) => {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AuthError("Необходима авторизация");
    }

    if (session.user.role !== "STUDENT") {
      throw new ForbiddenError("Доступно только для студентов");
    }

    const params = await context?.params;
    const streamId = params?.streamId;

    if (!streamId) {
      throw new NotFoundError("Поток не найден");
    }

    const userId = session.user.id;

    // 2. Check enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        streamId,
        status: "ACTIVE",
      },
      include: {
        stream: {
          include: {
            course: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    if (!enrollment) {
      throw new ForbiddenError("У вас нет доступа к этому потоку");
    }

    // 3. Get overall progress
    const progress = await prisma.studentProgress.findUnique({
      where: {
        userId_streamId: {
          userId,
          streamId,
        },
      },
    });

    // 4. Get lesson progress details
    const lessons = await prisma.lesson.findMany({
      where: {
        streamId,
        published: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
      include: {
        progress: {
          where: {
            userId,
          },
        },
      },
    });

    const lessonsWithProgress = lessons.map((lesson) => {
      const lessonProgress = lesson.progress[0];
      return {
        lessonId: lesson.id,
        title: lesson.title,
        type: lesson.type,
        completed: lessonProgress?.completed || false,
        watchedSeconds: lessonProgress?.watchedSeconds || 0,
        totalSeconds: lessonProgress?.totalSeconds || 0,
        watchProgress:
          lessonProgress?.totalSeconds && lessonProgress.totalSeconds > 0
            ? Math.round(
                (lessonProgress.watchedSeconds / lessonProgress.totalSeconds) *
                  100
              )
            : 0,
        lastWatchedAt: lessonProgress?.lastWatchedAt,
      };
    });

    // 5. Get quiz submissions
    const quizSubmissions = await prisma.lessonQuizSubmission.findMany({
      where: {
        studentId: userId,
        quiz: {
          lesson: {
            streamId,
          },
        },
      },
      select: {
        id: true,
        quizId: true,
        status: true,
        createdAt: true,
        checkedAt: true,
        quiz: {
          select: {
            id: true,
            title: true,
            type: true,
            lesson: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const quizzes = quizSubmissions.map((sub) => ({
      submissionId: sub.id,
      quizId: sub.quizId,
      lessonId: sub.quiz.lesson.id,
      lessonTitle: sub.quiz.lesson.title,
      status: sub.status,
      submittedAt: sub.createdAt,
      checkedAt: sub.checkedAt,
    }));

    // 6. Get homework submissions
    const homeworkSubmissions = await prisma.homeworkSubmission.findMany({
      where: {
        enrollment: {
          userId,
          streamId,
        },
      },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            dueAt: true,
          },
        },
      },
      orderBy: {
        submittedAt: "desc",
      },
    });

    const homeworks = homeworkSubmissions.map((sub) => ({
      submissionId: sub.id,
      assignmentId: sub.assignmentId,
      title: sub.assignment.title,
      status: sub.status,
      grade: sub.grade,
      submittedAt: sub.submittedAt,
      checkedAt: sub.checkedAt,
      dueDate: sub.assignment.dueAt,
    }));

    return NextResponse.json({
      overview: {
        streamName: enrollment.stream.name,
        courseName: enrollment.stream.course.title,
        lessonsCompleted: progress?.lessonsCompleted || 0,
        lessonsTotal: progress?.lessonsTotal || 0,
        quizzesPassed: progress?.quizzesPassed || 0,
        quizzesTotal: progress?.quizzesTotal || 0,
        averageQuizScore: progress?.averageQuizScore,
        homeworksAccepted: progress?.homeworksAccepted || 0,
        homeworksTotal: progress?.homeworksTotal || 0,
        totalWatchTimeHours: progress?.totalWatchTimeSeconds
          ? Math.round((progress.totalWatchTimeSeconds / 3600) * 10) / 10
          : 0,
        lastActivityAt: progress?.lastActivityAt,
      },
      lessons: lessonsWithProgress,
      quizzes,
      homeworks,
    });
  }
);
