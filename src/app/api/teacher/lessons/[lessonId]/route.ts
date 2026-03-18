import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { LessonType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

type UpdateLessonBody = {
  title?: string;
  type?: LessonType;
  content?: string | null;
  teacherNotes?: string | null;
  published?: boolean;
};

async function getSessionAndLesson(
  context: { params: Promise<Record<string, string>> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    throw new AuthError("Unauthorized");
  }

  const params = await context.params;
  const lessonId = params.lessonId;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { stream: true },
  });

  if (!lesson) {
    throw new NotFoundError("Lesson");
  }

  if (session.user.role !== "ADMIN" && lesson.stream.teacherId !== session.user.id) {
    throw new ForbiddenError("You do not have permission to access this lesson");
  }

  return { session, lesson };
}

export const PATCH = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<Record<string, string>> }
) => {
  const sessionAndLesson = await getSessionAndLesson(context!);

  const body = (await req.json().catch(() => null)) as UpdateLessonBody | null;
  if (!body) {
    throw new ValidationError("Invalid JSON");
  }

  const data: UpdateLessonBody = {};

  if (typeof body.title === "string" && body.title.trim().length > 0) {
    data.title = body.title.trim();
  }

  if (typeof body.type === "string") {
    if (!["LIVE", "VIDEO", "TEXT"].includes(body.type)) {
      throw new ValidationError("Некорректный тип урока", { type: "Invalid lesson type" });
    }
    data.type = body.type as LessonType;
  }

  if ("content" in body) {
    data.content = body.content ?? null;
  }

  if ("teacherNotes" in body) {
    data.teacherNotes =
      typeof body.teacherNotes === "string" && body.teacherNotes.trim().length > 0
        ? body.teacherNotes.trim()
        : null;
  }

  if (typeof body.published === "boolean") {
    data.published = body.published;
  }

  if (Object.keys(data).length === 0) {
    throw new ValidationError("Нет полей для обновления");
  }

  const updated = await prisma.lesson.update({
    where: { id: sessionAndLesson.lesson.id },
    data,
  });

  return NextResponse.json({ success: true, lesson: updated });
});

export const DELETE = withErrorHandling(async (
  _req: Request,
  context?: { params: Promise<Record<string, string>> }
) => {
  const sessionAndLesson = await getSessionAndLesson(context!);

  await prisma.$transaction([
    prisma.homework.deleteMany({ where: { lessonId: sessionAndLesson.lesson.id } }),
    prisma.lesson.delete({ where: { id: sessionAndLesson.lesson.id } }),
  ]);

  return NextResponse.json({ success: true });
});

