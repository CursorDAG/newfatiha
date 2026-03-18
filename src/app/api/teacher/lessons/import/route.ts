import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { rateLimit, rateLimitConfigs } from "@/lib/rate-limit";

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

  const body = await req.json().catch(() => null);
  if (!body) throw new ValidationError("Invalid JSON");

  const { fromStreamId, toStreamId, lessonIds } = body as {
    fromStreamId?: string;
    toStreamId?: string;
    lessonIds?: string[];
  };
  if (!fromStreamId || !toStreamId) {
    const errors: Record<string, string> = {};
    if (!fromStreamId) errors.fromStreamId = "Source stream ID is required";
    if (!toStreamId) errors.toStreamId = "Target stream ID is required";
    throw new ValidationError("fromStreamId and toStreamId are required", errors);
  }
  if (fromStreamId === toStreamId) {
    throw new ValidationError("Streams must be different", {
      toStreamId: "Target stream must be different from source stream",
    });
  }
  if (!Array.isArray(lessonIds) || lessonIds.length === 0) {
    throw new ValidationError("Выберите хотя бы один урок", {
      lessonIds: "At least one lesson must be selected",
    });
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
    throw new NotFoundError("Stream");
  }
  if (
    session.user.role !== "ADMIN" &&
    (fromStream.teacherId !== session.user.id || toStream.teacherId !== session.user.id)
  ) {
    throw new ForbiddenError("You do not have permission to access these streams");
  }

  if (!fromStream.lessons.length) {
    throw new ValidationError("Source stream has no lessons", {
      fromStreamId: "Source stream has no lessons",
    });
  }

  const lessonIdSet = new Set(lessonIds);
  const sourceLessons = [...fromStream.lessons]
    .filter((l) => lessonIdSet.has(l.id))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  if (sourceLessons.length === 0) {
    throw new ValidationError("Выбранные уроки не найдены в потоке-источнике", {
      lessonIds: "Selected lessons not found in source stream",
    });
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
});

