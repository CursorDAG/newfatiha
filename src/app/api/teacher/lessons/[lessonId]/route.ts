import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { LessonType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type UpdateLessonBody = {
  title?: string;
  type?: LessonType;
  content?: string | null;
  teacherNotes?: string | null;
  published?: boolean;
};

async function getSessionAndLesson(
  context: { params: Promise<{ lessonId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return { errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { lessonId } = await context.params;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { stream: true },
  });

  if (!lesson) {
    return {
      errorResponse: NextResponse.json({ error: "Lesson not found" }, { status: 404 }),
    };
  }

  if (session.user.role !== "ADMIN" && lesson.stream.teacherId !== session.user.id) {
    return { errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { session, lesson };
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ lessonId: string }> }
) {
  const sessionAndLesson = await getSessionAndLesson(context);
  if ("errorResponse" in sessionAndLesson) {
    return sessionAndLesson.errorResponse;
  }

  const body = (await req.json().catch(() => null)) as UpdateLessonBody | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: UpdateLessonBody = {};

  if (typeof body.title === "string" && body.title.trim().length > 0) {
    data.title = body.title.trim();
  }

  if (typeof body.type === "string") {
    if (!["LIVE", "VIDEO", "TEXT"].includes(body.type)) {
      return NextResponse.json({ error: "Некорректный тип урока" }, { status: 400 });
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
    return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 });
  }

  const updated = await prisma.lesson.update({
    where: { id: sessionAndLesson.lesson.id },
    data,
  });

  return NextResponse.json({ success: true, lesson: updated });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ lessonId: string }> }
) {
  const sessionAndLesson = await getSessionAndLesson(context);
  if ("errorResponse" in sessionAndLesson) {
    return sessionAndLesson.errorResponse;
  }

  try {
    await prisma.$transaction([
      prisma.homework.deleteMany({ where: { lessonId: sessionAndLesson.lesson.id } }),
      prisma.lesson.delete({ where: { id: sessionAndLesson.lesson.id } }),
    ]);
  } catch (err) {
    console.error("[DELETE /api/teacher/lessons]", err);
    return NextResponse.json(
      { error: "Не удалось удалить урок. Возможно, есть связанные данные." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

