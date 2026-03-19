import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { QuestionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

export const POST = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<Record<string, string>> }
) => {
  const params = await context!.params;
  const quizId = params.quizId;

  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    throw new AuthError("Unauthorized");
  }

  const quiz = await prisma.lessonQuiz.findUnique({
    where: { id: quizId },
    include: {
      lesson: {
        include: { stream: true },
      },
      questions: true,
    },
  });

  if (!quiz) throw new NotFoundError("Quiz");
  if (session.user.role !== "ADMIN" && quiz.lesson.stream.teacherId !== session.user.id) {
    throw new ForbiddenError("You do not have permission to access this quiz");
  }

  const body = await req.json().catch(() => null);
  if (!body) throw new ValidationError("Invalid JSON");

  const {
    prompt,
    type,
    options,
    correctOptionIndex,
  }: {
    prompt?: string;
    type?: QuestionType;
    options?: string[];
    correctOptionIndex?: number;
  } = body;

  if (!prompt?.trim()) {
    throw new ValidationError("prompt is required", { prompt: "Prompt is required" });
  }

  if (!type || !["MULTIPLE_CHOICE", "TEXT", "VOICE"].includes(type)) {
    throw new ValidationError("Invalid type", { type: "Question type must be MULTIPLE_CHOICE, TEXT, or VOICE" });
  }

  const nextSortOrder = Math.max(0, ...quiz.questions.map((q) => q.sortOrder)) + 1;

  if (type === "MULTIPLE_CHOICE") {
    const cleaned = (options ?? []).map((s) => (s ?? "").trim()).filter(Boolean);
    if (cleaned.length < 2) {
      throw new ValidationError("At least 2 options required", { options: "At least 2 options are required" });
    }
    if (typeof correctOptionIndex !== "number" || correctOptionIndex < 0 || correctOptionIndex >= cleaned.length) {
      throw new ValidationError("correctOptionIndex is invalid", { correctOptionIndex: "Correct option index is invalid" });
    }

    const question = await prisma.lessonQuizQuestion.create({
      data: {
        quizId,
        prompt: prompt.trim(),
        type,
        sortOrder: nextSortOrder,
        options: {
          create: cleaned.map((text, idx) => ({
            text,
            isCorrect: idx === correctOptionIndex,
            sortOrder: idx,
          })),
        },
      },
    });

    return NextResponse.json({ success: true, questionId: question.id });
  }

  // TEXT or VOICE type
  const question = await prisma.lessonQuizQuestion.create({
    data: {
      quizId,
      prompt: prompt.trim(),
      type,
      sortOrder: nextSortOrder,
    },
  });

  return NextResponse.json({ success: true, questionId: question.id });
});
