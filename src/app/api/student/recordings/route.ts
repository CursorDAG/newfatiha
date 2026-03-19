/**
 * GET /api/student/recordings
 * Get all available lesson recordings for the student
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
    throw new ForbiddenError("Этот эндпоинт доступен только студентам");
  }

  const userId = session.user.id;

  // 2. Get all active enrollments
  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId,
      status: "ACTIVE",
    },
    select: {
      streamId: true,
    },
  });

  const streamIds = enrollments.map((e) => e.streamId);

  if (streamIds.length === 0) {
    return NextResponse.json({ recordings: [] });
  }

  // 3. Get all recordings for lessons in these streams
  const recordings = await prisma.lessonRecording.findMany({
    where: {
      streamId: { in: streamIds },
      status: "READY",
      lesson: {
        published: true,
      },
    },
    include: {
      lesson: {
        select: {
          id: true,
          title: true,
          stream: {
            select: {
              id: true,
              name: true,
              course: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      recordedAt: "desc",
    },
  });

  // 4. Get watch progress for these lessons
  const lessonIds = recordings.map((r) => r.lessonId);
  const progressRecords = await prisma.lessonProgress.findMany({
    where: {
      userId,
      lessonId: { in: lessonIds },
    },
    select: {
      lessonId: true,
      watchedSeconds: true,
      totalSeconds: true,
      completed: true,
    },
  });

  const progressMap = new Map(
    progressRecords.map((p) => [
      p.lessonId,
      {
        watchedSeconds: p.watchedSeconds,
        totalSeconds: p.totalSeconds,
        completed: p.completed,
        watchProgress:
          p.totalSeconds && p.totalSeconds > 0
            ? p.watchedSeconds / p.totalSeconds
            : 0,
      },
    ])
  );

  // 5. Format response
  const formattedRecordings = recordings.map((recording) => {
    const progress = progressMap.get(recording.lessonId);

    return {
      id: recording.id,
      lessonId: recording.lessonId,
      lessonTitle: recording.lesson.title,
      streamId: recording.lesson.stream.id,
      streamName: recording.lesson.stream.name,
      courseName: recording.lesson.stream.course.title,
      recordedAt: recording.recordedAt,
      duration: recording.duration,
      thumbnailUrl: recording.thumbnailUrl,
      watched: progress?.completed || false,
      watchProgress: progress?.watchProgress || 0,
      fileSize: recording.fileSize?.toString(),
    };
  });

  return NextResponse.json({
    recordings: formattedRecordings,
  });
});
