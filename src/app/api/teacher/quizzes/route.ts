import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { QuizType } from "@prisma/client";
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

  const {
    lessonId,
    title,
    type,
    prompt,
    options,
    correctOptionIndex,
  }: {
    lessonId?: string;
    title?: string;
    type?: QuizType;
    prompt?: string;
    options?: string[];
    correctOptionIndex?: number;
  } = body;

  if (!lessonId) {
    throw new ValidationError("lessonId is required", { lessonId: "Lesson ID is required" });
  }
  if (!title?.trim()) {
    throw new ValidationError("title is required", { title: "Title is required" });
  }
  if (!type || !Object.values(QuizType).includes(type)) {
    throw new ValidationError("Invalid type", { type: "Quiz type must be MULTIPLE_CHOICE or VOICE" });
  }
  if (!prompt?.trim()) {
    throw new ValidationError("prompt is required", { prompt: "Prompt is required" });
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { stream: true },
  });
  if (!lesson) throw new NotFoundError("Lesson");
  if (session.user.role !== "ADMIN" && lesson.stream.teacherId !== session.user.id) {
    throw new ForbiddenError("You do not have permission to access this lesson");
  }

  if (type === "MULTIPLE_CHOICE") {
    const cleaned = (options ?? []).map((s) => (s ?? "").trim()).filter(Boolean);
    if (cleaned.length < 2) {
      throw new ValidationError("At least 2 options required", { options: "At least 2 options are required" });
    }
    if (typeof correctOptionIndex !== "number" || correctOptionIndex < 0 || correctOptionIndex >= cleaned.length) {
      throw new ValidationError("correctOptionIndex is invalid", { correctOptionIndex: "Correct option index is invalid" });
    }

    const quiz = await prisma.lessonQuiz.create({
      data: {
        lessonId,
        title: title.trim(),
        type,
        questions: {
          create: {
            prompt: prompt.trim(),
            sortOrder: 0,
            options: {
              create: cleaned.map((text, idx) => ({
                text,
                isCorrect: idx === correctOptionIndex,
                sortOrder: idx,
              })),
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, quizId: quiz.id });
  }

  const quiz = await prisma.lessonQuiz.create({
    data: {
      lessonId,
      title: title.trim(),
      type,
      questions: {
        create: {
          prompt: prompt.trim(),
          sortOrder: 0,
        },
      },
    },
  });

  return NextResponse.json({ success: true, quizId: quiz.id });
});

