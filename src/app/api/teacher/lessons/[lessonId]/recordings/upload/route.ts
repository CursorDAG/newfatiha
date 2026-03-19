/**
 * POST /api/teacher/lessons/[lessonId]/recordings/upload
 * Generate presigned URL for uploading lesson recording
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import {
  AuthError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/errors";
import {
  getPresignedUploadUrl,
  generateRecordingKey,
  isS3Configured,
} from "@/lib/s3";

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const ALLOWED_CONTENT_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export const POST = withErrorHandling(
  async (req: Request, context?: { params: Promise<Record<string, string>> }) => {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AuthError("Необходима авторизация");
    }

    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      throw new ForbiddenError("Только учителя могут загружать записи");
    }

    // 2. Check S3 configuration
    if (!isS3Configured()) {
      throw new ValidationError(
        "S3 хранилище не настроено. Обратитесь к администратору."
      );
    }

    const params = await context?.params;
    const lessonId = params?.lessonId;

    if (!lessonId) {
      throw new NotFoundError("Урок не найден");
    }

    // 3. Get lesson and verify ownership
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        stream: {
          select: {
            id: true,
            teacherId: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundError("Урок не найден");
    }

    if (
      lesson.stream.teacherId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      throw new ForbiddenError("Вы не можете загружать записи для этого урока");
    }

    // 4. Parse and validate request body
    const body = await req.json().catch(() => null);
    if (!body) {
      throw new ValidationError("Неверный формат запроса");
    }

    const { fileName, fileSize, contentType } = body;

    if (!fileName || typeof fileName !== "string") {
      throw new ValidationError("Не указано имя файла", {
        fileName: "Обязательное поле",
      });
    }

    if (!fileSize || typeof fileSize !== "number" || fileSize <= 0) {
      throw new ValidationError("Неверный размер файла", {
        fileSize: "Должен быть положительным числом",
      });
    }

    if (fileSize > MAX_FILE_SIZE) {
      throw new ValidationError(
        `Размер файла превышает максимально допустимый (${MAX_FILE_SIZE / 1024 / 1024 / 1024}GB)`,
        {
          fileSize: "Файл слишком большой",
        }
      );
    }

    if (!contentType || !ALLOWED_CONTENT_TYPES.includes(contentType)) {
      throw new ValidationError(
        "Неподдерживаемый формат видео. Разрешены: MP4, WebM, QuickTime",
        {
          contentType: "Неверный тип файла",
        }
      );
    }

    // 5. Generate S3 key
    const s3Key = generateRecordingKey(
      lesson.stream.id,
      lessonId,
      fileName
    );

    // 6. Create LessonRecording record with PROCESSING status
    const recording = await prisma.lessonRecording.create({
      data: {
        lessonId,
        streamId: lesson.stream.id,
        videoUrl: s3Key,
        status: "PROCESSING",
        fileSize: BigInt(fileSize),
      },
    });

    // 7. Generate presigned upload URL (expires in 1 hour)
    const uploadUrl = await getPresignedUploadUrl(s3Key, contentType, 3600);

    return NextResponse.json({
      recordingId: recording.id,
      uploadUrl,
      s3Key,
    });
  }
);
