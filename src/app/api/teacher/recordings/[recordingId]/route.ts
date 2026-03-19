/**
 * DELETE /api/teacher/recordings/[recordingId]
 * Delete a lesson recording
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import {
  AuthError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/errors";
import { deleteObject } from "@/lib/s3";
import { logger } from "@/lib/logger";

export const DELETE = withErrorHandling(
  async (req: Request, context?: { params: Promise<Record<string, string>> }) => {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AuthError("Необходима авторизация");
    }

    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      throw new ForbiddenError("Только учителя могут удалять записи");
    }

    const params = await context?.params;
    const recordingId = params?.recordingId;

    if (!recordingId) {
      throw new NotFoundError("Запись не найдена");
    }

    // 2. Get recording and verify ownership
    const recording = await prisma.lessonRecording.findUnique({
      where: { id: recordingId },
      include: {
        lesson: {
          include: {
            stream: {
              select: {
                teacherId: true,
              },
            },
          },
        },
      },
    });

    if (!recording) {
      throw new NotFoundError("Запись не найдена");
    }

    if (
      recording.lesson.stream.teacherId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      throw new ForbiddenError("Вы не можете удалять эту запись");
    }

    // 3. Delete from S3
    try {
      await deleteObject(recording.videoUrl);

      // Delete thumbnail if exists
      if (recording.thumbnailUrl) {
        await deleteObject(recording.thumbnailUrl);
      }
    } catch (error) {
      logger.error({ error, recordingId, videoUrl: recording.videoUrl }, "Failed to delete from S3");
      // Continue with database deletion even if S3 deletion fails
    }

    // 4. Delete from database (cascade will delete related LessonProgress)
    await prisma.lessonRecording.delete({
      where: { id: recordingId },
    });

    return NextResponse.json({
      success: true,
      message: "Запись успешно удалена",
    });
  }
);
