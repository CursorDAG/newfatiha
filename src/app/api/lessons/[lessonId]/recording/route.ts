/**
 * GET /api/lessons/[lessonId]/recording
 * Get lesson recording for viewing (generates signed URL)
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
import { getSignedViewUrl } from "@/lib/s3";

export const GET = withErrorHandling(
  async (req: Request, context?: { params: Promise<Record<string, string>> }) => {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AuthError("Необходима авторизация");
    }

    const params = await context?.params;
    const lessonId = params?.lessonId;

    if (!lessonId) {
      throw new NotFoundError("Урок не найден");
    }

    // 2. Get lesson with stream
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

    // 3. Check access permissions
    const isTeacher = lesson.stream.teacherId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    let hasAccess = isTeacher || isAdmin;

    // For students, check enrollment
    if (!hasAccess && session.user.role === "STUDENT") {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId: session.user.id,
          streamId: lesson.stream.id,
          status: "ACTIVE",
        },
      });

      hasAccess = !!enrollment;
    }

    if (!hasAccess) {
      throw new ForbiddenError("У вас нет доступа к этой записи");
    }

    // 4. Find recording with READY status
    const recording = await prisma.lessonRecording.findFirst({
      where: {
        lessonId,
        status: "READY",
      },
      orderBy: {
        recordedAt: "desc",
      },
    });

    if (!recording) {
      return NextResponse.json({
        recording: null,
        message: "Запись урока пока недоступна",
      });
    }

    // 5. Generate signed URL for viewing (expires in 4 hours)
    const videoUrl = await getSignedViewUrl(recording.videoUrl, 14400);

    return NextResponse.json({
      recording: {
        id: recording.id,
        videoUrl,
        thumbnailUrl: recording.thumbnailUrl,
        duration: recording.duration,
        recordedAt: recording.recordedAt,
        fileSize: recording.fileSize?.toString(),
      },
    });
  }
);
