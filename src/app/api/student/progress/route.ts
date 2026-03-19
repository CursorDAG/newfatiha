/**
 * GET /api/student/progress
 * Get overall progress for all streams the student is enrolled in
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError } from "@/lib/errors";

export const GET = withErrorHandling(async (req: Request) => {
  // 1. Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Необходима авторизация");
  }

  if (session.user.role !== "STUDENT") {
    throw new ForbiddenError("Доступно только для студентов");
  }

  const userId = session.user.id;

  // 2. Get all active enrollments
  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId,
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

  // 3. Get progress for each stream
  const streams = await Promise.all(
    enrollments.map(async (enrollment) => {
      const progress = await prisma.studentProgress.findUnique({
        where: {
          userId_streamId: {
            userId,
            streamId: enrollment.streamId,
          },
        },
      });

      return {
        streamId: enrollment.stream.id,
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
      };
    })
  );

  return NextResponse.json({ streams });
});
