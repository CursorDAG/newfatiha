import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { fromStreamId, toStreamId, lessonIds } = body as {
    fromStreamId?: string;
    toStreamId?: string;
    lessonIds?: string[];
  };
  if (!fromStreamId || !toStreamId) {
    return NextResponse.json({ error: "fromStreamId and toStreamId are required" }, { status: 400 });
  }
  if (fromStreamId === toStreamId) {
    return NextResponse.json({ error: "Streams must be different" }, { status: 400 });
  }
  if (!Array.isArray(lessonIds) || lessonIds.length === 0) {
    return NextResponse.json({ error: "Выберите хотя бы один урок" }, { status: 400 });
  }

  const [fromStream, toStream] = await Promise.all([
    prisma.stream.findUnique({
      where: { id: fromStreamId },
      include: {
        lessons: {
          orderBy: { sortOrder: "asc" },
          include: {
            quizzes: {
              include: {
                questions: { include: { options: true } },
              },
            },
          },
        },
      },
    }),
    prisma.stream.findUnique({ where: { id: toStreamId } }),
  ]);

  if (!fromStream || !toStream) {
    return NextResponse.json({ error: "Stream not found" }, { status: 404 });
  }
  if (
    session.user.role !== "ADMIN" &&
    (fromStream.teacherId !== session.user.id || toStream.teacherId !== session.user.id)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!fromStream.lessons.length) {
    return NextResponse.json({ error: "Source stream has no lessons" }, { status: 400 });
  }

  const lessonIdSet = new Set(lessonIds);
  const sourceLessons = [...fromStream.lessons]
    .filter((l) => lessonIdSet.has(l.id))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  if (sourceLessons.length === 0) {
    return NextResponse.json(
      { error: "Выбранные уроки не найдены в потоке-источнике" },
      { status: 400 },
    );
  }

  // Determine the current max sortOrder in the target stream so cloned lessons
  // are appended after any existing lessons rather than landing at sortOrder 0.
  const maxSortResult = await prisma.lesson.aggregate({
    where: { streamId: toStream.id },
    _max: { sortOrder: true },
  });
  const baseSortOrder = (maxSortResult._max.sortOrder ?? 0) + 1;

  const created = await prisma.$transaction(async (tx) => {
    let createdLessons = 0;
    let createdQuizzes = 0;

    for (let idx = 0; idx < sourceLessons.length; idx++) {
      const lesson = sourceLessons[idx];
      const newLesson = await tx.lesson.create({
        data: {
          title: lesson.title,
          type: lesson.type,
          content: lesson.content,
          sortOrder: baseSortOrder + idx,
          streamId: toStream.id,
        },
      });
      createdLessons += 1;

      for (const quiz of lesson.quizzes) {
        const newQuiz = await tx.lessonQuiz.create({
          data: {
            lessonId: newLesson.id,
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
          },
        });
        if (newQuiz) createdQuizzes += 1;
      }
    }

    return { createdLessons, createdQuizzes };
  });

  return NextResponse.json({ success: true, ...created });
}

