/**
 * POST /api/teacher/recordings/[recordingId]/complete
 * Mark recording upload as complete and update metadata
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
  ValidationError,
} from "@/lib/errors";
import { getObjectMetadata } from "@/lib/s3";

export const POST = withErrorHandling(
  async (req: Request, context?: { params: Promise<Record<string, string>> }) => {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AuthError("Необходима авторизация");
    }

    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      throw new ForbiddenError("Только учителя могут завершать загрузку записей");
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
      throw new ForbiddenError("Вы не можете изменять эту запись");
    }

    // 3. Check current status
    if (recording.status !== "PROCESSING") {
      throw new ValidationError(
        "Запись уже обработана или произошла ошибка",
        {
          status: `Текущий статус: ${recording.status}`,
        }
      );
    }

    // 4. Parse request body (optional duration from client)
    const body = await req.json().catch(() => ({}));
    const { duration } = body;

    // 5. Get metadata from S3
    try {
      const metadata = await getObjectMetadata(recording.videoUrl);

      // 6. Update recording status to READY
      const updatedRecording = await prisma.lessonRecording.update({
        where: { id: recordingId },
        data: {
          status: "READY",
          processedAt: new Date(),
          fileSize: BigInt(metadata.size),
          duration: duration && typeof duration === "number" ? duration : null,
        },
      });

      return NextResponse.json({
        success: true,
        recording: {
          id: updatedRecording.id,
          status: updatedRecording.status,
          processedAt: updatedRecording.processedAt,
          fileSize: updatedRecording.fileSize?.toString(),
          duration: updatedRecording.duration,
        },
      });
    } catch {
      // If S3 metadata fetch fails, mark as FAILED
      await prisma.lessonRecording.update({
        where: { id: recordingId },
        data: {
          status: "FAILED",
          processedAt: new Date(),
        },
      });

      throw new ValidationError(
        "Не удалось получить метаданные файла из хранилища. Проверьте, что файл был успешно загружен."
      );
    }
  }
);
