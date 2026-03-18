import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

type FromTemplateBody = {
  streamId?: string;
  templateLessonId?: string;
};

export const POST = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    throw new AuthError("Unauthorized");
  }

  const body = (await req.json().catch(() => null)) as FromTemplateBody | null;
  if (!body) throw new ValidationError("Invalid JSON");

  const { streamId, templateLessonId } = body;
  if (!streamId || !templateLessonId) {
    const errors: Record<string, string> = {};
    if (!streamId) errors.streamId = "Stream ID is required";
    if (!templateLessonId) errors.templateLessonId = "Template lesson ID is required";
    throw new ValidationError("streamId и templateLessonId обязательны", errors);
  }

  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { id: true, teacherId: true },
  });
  if (!stream) throw new NotFoundError("Stream");
  if (session.user.role !== "ADMIN" && stream.teacherId !== session.user.id) {
    throw new ForbiddenError("You do not have permission to access this stream");
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
    throw new NotFoundError("Template lesson not found");
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
        create: template.quizzes.map((quiz) => ({
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
});

