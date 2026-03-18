import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { LessonType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as CreateLessonBody | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { streamId, title, type, content, sortOrder, teacherNotes } = body;

  if (!streamId || !title || !type) {
    return NextResponse.json(
      { error: "streamId, title и type являются обязательными полями" },
      { status: 400 }
    );
  }

  const normalizedType =
    typeof type === "string" && ["LIVE", "VIDEO", "TEXT"].includes(type)
      ? (type as LessonType)
      : null;

  if (!normalizedType) {
    return NextResponse.json({ error: "Некорректный тип урока" }, { status: 400 });
  }

  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { id: true, teacherId: true },
  });

  if (!stream) {
    return NextResponse.json({ error: "Поток не найден" }, { status: 404 });
  }

  if (session.user.role !== "ADMIN" && stream.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  return NextResponse.json({ success: true, lesson });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as ReorderLessonsBody | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { streamId, lessonIdsInOrder } = body;
  if (!streamId || !Array.isArray(lessonIdsInOrder) || !lessonIdsInOrder.length) {
    return NextResponse.json(
      { error: "streamId и lessonIdsInOrder обязательны" },
      { status: 400 }
    );
  }

  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { id: true, teacherId: true },
  });

  if (!stream) {
    return NextResponse.json({ error: "Поток не найден" }, { status: 404 });
  }

  if (session.user.role !== "ADMIN" && stream.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existingLessons = await prisma.lesson.findMany({
    where: { streamId: stream.id },
    select: { id: true },
  });
  const existingIds = new Set(existingLessons.map((l) => l.id));

  if (!lessonIdsInOrder.every((id) => existingIds.has(id))) {
    return NextResponse.json(
      { error: "lessonIdsInOrder содержит уроки, не принадлежащие потоку" },
      { status: 400 }
    );
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
}

