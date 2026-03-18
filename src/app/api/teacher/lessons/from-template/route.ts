import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

type FromTemplateBody = {
  streamId?: string;
  templateLessonId?: string;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as FromTemplateBody | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { streamId, templateLessonId } = body;
  if (!streamId || !templateLessonId) {
    return NextResponse.json({ error: "streamId и templateLessonId обязательны" }, { status: 400 });
  }

  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { id: true, teacherId: true },
  });
  if (!stream) return NextResponse.json({ error: "Stream not found" }, { status: 404 });
  if (session.user.role !== "ADMIN" && stream.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const template = await prisma.lesson.findUnique({
    where: { id: templateLessonId },
    include: {
      quizzes: {
        include: {
          questions: {
            include: {
              options: true,
            },
          },
        },
      },
    },
  });

  if (!template || !template.isTemplate) {
    return NextResponse.json({ error: "Template lesson not found" }, { status: 404 });
  }

  const maxSort = await prisma.lesson.aggregate({
    where: { streamId },
    _max: { sortOrder: true },
  });

  const baseSortOrder = (maxSort._max.sortOrder ?? 0) + 1;

  const created = await prisma.lesson.create({
    data: {
      streamId,
      title: template.title,
      type: template.type,
      content: template.content,
      teacherNotes: template.teacherNotes,
      sortOrder: baseSortOrder,
      quizzes: {
        create: template.quizzes.map((quiz, quizIdx) => ({
          title: quiz.title,
          type: quiz.type,
          questions: {
            create: quiz.questions.map((q) => ({
              prompt: q.prompt,
              sortOrder: q.sortOrder,
              options: {
                create: q.options.map((o) => ({
                  text: o.text,
                  isCorrect: o.isCorrect,
                  sortOrder: o.sortOrder,
                })),
              },
            })),
          },
        })),
      },
    },
  });

  return NextResponse.json({ success: true, lessonId: created.id });
}

