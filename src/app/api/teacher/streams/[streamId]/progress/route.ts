/**
 * GET /api/teacher/streams/[streamId]/progress
 * Get progress for all students in a stream (teacher view)
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import {
  AuthError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors";

export const GET = withErrorHandling(
  async (req: Request, context?: { params: Promise<Record<string, string>> }) => {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AuthError("Необходима авторизация");
    }

    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      throw new ForbiddenError("Доступно только для учителей");
    }

    const params = await context?.params;
    const streamId = params?.streamId;

    if (!streamId) {
      throw new NotFoundError("Поток не найден");
    }

    // 2. Get stream and verify ownership
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
      include: {
        course: {
          select: {
            teacherId: true,
          },
        },
      },
    });

    if (!stream) {
      throw new NotFoundError("Поток не найден");
    }

    if (
      stream.course.teacherId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      throw new ForbiddenError("У вас нет доступа к этому потоку");
    }

    // 3. Get all active enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: {
        streamId,
        status: "ACTIVE",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    // 4. Get progress for each student
    const students = await Promise.all(
      enrollments.map(async (enrollment) => {
        const progress = await prisma.studentProgress.findUnique({
          where: {
            userId_streamId: {
              userId: enrollment.userId,
              streamId,
            },
          },
        });

        return {
          userId: enrollment.user.id,
          name: enrollment.user.name,
          email: enrollment.user.email,
          progress: {
            lessonsCompleted: progress?.lessonsCompleted || 0,
            lessonsTotal: progress?.lessonsTotal || 0,
            lessonsPercent:
              progress?.lessonsTotal && progress.lessonsTotal > 0
                ? Math.round(
                    (progress.lessonsCompleted / progress.lessonsTotal) * 100
                  )
                : 0,
            quizzesPassed: progress?.quizzesPassed || 0,
            quizzesTotal: progress?.quizzesTotal || 0,
            quizzesPercent:
              progress?.quizzesTotal && progress.quizzesTotal > 0
                ? Math.round(
                    (progress.quizzesPassed / progress.quizzesTotal) * 100
                  )
                : 0,
            averageQuizScore: progress?.averageQuizScore,
            homeworksAccepted: progress?.homeworksAccepted || 0,
            homeworksTotal: progress?.homeworksTotal || 0,
            homeworksPercent:
              progress?.homeworksTotal && progress.homeworksTotal > 0
                ? Math.round(
                    (progress.homeworksAccepted / progress.homeworksTotal) * 100
                  )
                : 0,
            totalWatchTimeHours: progress?.totalWatchTimeSeconds
              ? Math.round((progress.totalWatchTimeSeconds / 3600) * 10) / 10
              : 0,
            lastActivityAt: progress?.lastActivityAt,
          },
        };
      })
    );

    // 5. Calculate aggregates
    const totalStudents = students.length;
    const averageLessonsPercent =
      totalStudents > 0
        ? Math.round(
            students.reduce((sum, s) => sum + s.progress.lessonsPercent, 0) /
              totalStudents
          )
        : 0;

    const studentsWithQuizScore = students.filter(
      (s) => s.progress.averageQuizScore !== null
    );
    const averageQuizScore =
      studentsWithQuizScore.length > 0
        ? Math.round(
            studentsWithQuizScore.reduce(
              (sum, s) => sum + (s.progress.averageQuizScore || 0),
              0
            ) / studentsWithQuizScore.length
          )
        : null;

    const averageHomeworksPercent =
      totalStudents > 0
        ? Math.round(
            students.reduce((sum, s) => sum + s.progress.homeworksPercent, 0) /
              totalStudents
          )
        : 0;

    const totalWatchTimeHours =
      Math.round(
        students.reduce((sum, s) => sum + s.progress.totalWatchTimeHours, 0) *
          10
      ) / 10;

    return NextResponse.json({
      students,
      aggregates: {
        totalStudents,
        averageLessonsPercent,
        averageQuizScore,
        averageHomeworksPercent,
        totalWatchTimeHours,
      },
    });
  }
);
