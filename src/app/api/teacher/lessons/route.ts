import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { LessonType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { rateLimit, rateLimitConfigs } from "@/lib/rate-limit";
import { NotificationService } from "@/lib/notification-service";

type CreateLessonBody = {
  streamId?: string;
  title?: string;
  type?: LessonType | string;
  content?: string | null;
  sortOrder?: number;
  teacherNotes?: string | null;
};

type ReorderLessonsBody = {
  streamId?: string;
  lessonIdsInOrder?: string[];
};

export const POST = withErrorHandling(async (req: Request) => {
  // Apply rate limiting
  const rateLimitResponse = await rateLimit(req, rateLimitConfigs.general);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    throw new AuthError("Unauthorized");
  }

  const body = (await req.json().catch(() => null)) as CreateLessonBody | null;
  if (!body) {
    throw new ValidationError("Invalid JSON");
  }

  const { streamId, title, type, content, sortOrder, teacherNotes } = body;

  if (!streamId || !title || !type) {
    const errors: Record<string, string> = {};
    if (!streamId) errors.streamId = "Stream ID is required";
    if (!title) errors.title = "Title is required";
    if (!type) errors.type = "Type is required";
    throw new ValidationError("streamId, title и type являются обязательными полями", errors);
  }

  const normalizedType =
    typeof type === "string" && ["LIVE", "VIDEO", "TEXT"].includes(type)
      ? (type as LessonType)
      : null;

  if (!normalizedType) {
    throw new ValidationError("Некорректный тип урока", { type: "Invalid lesson type" });
  }

  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { id: true, teacherId: true },
  });

  if (!stream) {
    throw new NotFoundError("Поток не найден");
  }

  if (session.user.role !== "ADMIN" && stream.teacherId !== session.user.id) {
    throw new ForbiddenError("You do not have permission to access this stream");
  }

  const targetSortOrder =
    typeof sortOrder === "number"
      ? sortOrder
      : (await prisma.lesson
          .findFirst({
            where: { streamId: stream.id },
            orderBy: { sortOrder: "desc" },
            select: { sortOrder: true },
          })
          .then((l) => (l?.sortOrder ?? 0) + 1));

  const lesson = await prisma.lesson.create({
    data: {
      title,
      type: normalizedType,
      content: content ?? null,
      teacherNotes: teacherNotes ?? null,
      sortOrder: targetSortOrder,
      streamId: stream.id,
    },
  });

  // Уведомить студентов о новом уроке
  if (lesson.published) {
    await NotificationService.notifyNewLesson(stream.id, lesson.id).catch((err) => {
      // Не блокировать создание урока, если уведомления не отправились
      console.error("Failed to send notifications:", err);
    });
  }

  return NextResponse.json({ success: true, lesson });
});

export const PATCH = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    throw new AuthError("Unauthorized");
  }

  const body = (await req.json().catch(() => null)) as ReorderLessonsBody | null;
  if (!body) {
    throw new ValidationError("Invalid JSON");
  }

  const { streamId, lessonIdsInOrder } = body;
  if (!streamId || !Array.isArray(lessonIdsInOrder) || !lessonIdsInOrder.length) {
    const errors: Record<string, string> = {};
    if (!streamId) errors.streamId = "Stream ID is required";
    if (!Array.isArray(lessonIdsInOrder) || !lessonIdsInOrder.length) errors.lessonIdsInOrder = "Lesson IDs are required";
    throw new ValidationError("streamId и lessonIdsInOrder обязательны", errors);
  }

  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { id: true, teacherId: true },
  });

  if (!stream) {
    throw new NotFoundError("Поток не найден");
  }

  if (session.user.role !== "ADMIN" && stream.teacherId !== session.user.id) {
    throw new ForbiddenError("You do not have permission to access this stream");
  }

  const existingLessons = await prisma.lesson.findMany({
    where: { streamId: stream.id },
    select: { id: true },
  });
  const existingIds = new Set(existingLessons.map((l) => l.id));

  if (!lessonIdsInOrder.every((id) => existingIds.has(id))) {
    throw new ValidationError("lessonIdsInOrder содержит уроки, не принадлежащие потоку", {
      lessonIdsInOrder: "Some lesson IDs do not belong to this stream",
    });
  }

  await prisma.$transaction(
    lessonIdsInOrder.map((id, index) =>
      prisma.lesson.update({
        where: { id },
        data: { sortOrder: index + 1 },
      })
    )
  );

  return NextResponse.json({ success: true });
});

