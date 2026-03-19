/**
 * POST /api/progress/video-heartbeat
 * Track video watching progress for students
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ValidationError, ForbiddenError } from "@/lib/errors";
import { recalculateStudentProgress } from "@/lib/progress";
import { logger } from "@/lib/logger";

export const POST = withErrorHandling(async (req: Request) => {
  // 1. Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Необходима авторизация");
  }

  // 2. Parse and validate request body
  const body = await req.json().catch(() => null);
  if (!body) {
    throw new ValidationError("Неверный формат запроса");
  }

  const { lessonId, streamId, currentTime, duration } = body;

  if (!lessonId || typeof lessonId !== "string") {
    throw new ValidationError("Не указан ID урока");
  }

  if (!streamId || typeof streamId !== "string") {
    throw new ValidationError("Не указан ID потока");
  }

  if (typeof currentTime !== "number" || currentTime < 0) {
    throw new ValidationError("Неверное текущее время");
  }

  if (typeof duration !== "number" || duration <= 0) {
    throw new ValidationError("Неверная длительность видео");
  }

  // 3. Verify enrollment (students only need active enrollment)
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId: session.user.id,
      streamId,
      status: "ACTIVE",
    },
  });

  if (!enrollment && session.user.role === "STUDENT") {
    throw new ForbiddenError("У вас нет доступа к этому уроку");
  }

  // Teachers and admins can track their own viewing without enrollment
  const canTrack =
    enrollment ||
    session.user.role === "TEACHER" ||
    session.user.role === "ADMIN";

  if (!canTrack) {
    throw new ForbiddenError("У вас нет доступа к этому уроку");
  }

  // 4. Upsert LessonProgress
  const watchedSeconds = Math.floor(currentTime);
  const totalSeconds = Math.floor(duration);
  const completed = watchedSeconds / totalSeconds >= 0.8; // 80% threshold

  // Check if lesson was previously incomplete
  const existingProgress = await prisma.lessonProgress.findUnique({
    where: {
      userId_lessonId: {
        userId: session.user.id,
        lessonId,
      },
    },
  });

  const wasIncomplete = !existingProgress?.completed;

  const progress = await prisma.lessonProgress.upsert({
    where: {
      userId_lessonId: {
        userId: session.user.id,
        lessonId,
      },
    },
    create: {
      userId: session.user.id,
      lessonId,
      streamId,
      watchedSeconds,
      totalSeconds,
      completed,
      lastWatchedAt: new Date(),
      completedAt: completed ? new Date() : null,
    },
    update: {
      watchedSeconds: {
        set: Math.max(watchedSeconds, 0),
      },
      totalSeconds,
      completed,
      lastWatchedAt: new Date(),
      completedAt: completed ? new Date() : undefined,
    },
  });

  // 5. Trigger progress recalculation if lesson just became completed
  if (completed && wasIncomplete && session.user.role === "STUDENT") {
    recalculateStudentProgress(session.user.id, streamId).catch((err) =>
      logger.error({ error: err, userId: session.user.id, streamId }, "Failed to recalculate progress")
    );
  }

  return NextResponse.json({
    success: true,
    progress: {
      watchedSeconds: progress.watchedSeconds,
      totalSeconds: progress.totalSeconds,
      completed: progress.completed,
      watchProgress:
        progress.totalSeconds && progress.totalSeconds > 0
          ? progress.watchedSeconds / progress.totalSeconds
          : 0,
    },
  });
});
