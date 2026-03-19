import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { QuizType, QuestionType } from "@prisma/client";
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
    questions,
  }: {
    lessonId?: string;
    title?: string;
    questions?: Array<{
      prompt: string;
      type: QuestionType;
      options?: string[];
      correctOptionIndex?: number;
    }>;
  } = body;

  if (!lessonId) {
    throw new ValidationError("lessonId is required", { lessonId: "Lesson ID is required" });
  }
  if (!title?.trim()) {
    throw new ValidationError("title is required", { title: "Title is required" });
  }
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    throw new ValidationError("At least one question is required", { questions: "At least one question is required" });
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { stream: true },
  });
  if (!lesson) throw new NotFoundError("Lesson");
  if (session.user.role !== "ADMIN" && lesson.stream.teacherId !== session.user.id) {
    throw new ForbiddenError("You do not have permission to access this lesson");
  }

  // Validate all questions
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.prompt?.trim()) {
      throw new ValidationError(`Question ${i + 1} prompt is required`, { [`questions[${i}].prompt`]: "Prompt is required" });
    }
    if (!q.type || !["MULTIPLE_CHOICE", "TEXT", "VOICE"].includes(q.type)) {
      throw new ValidationError(`Question ${i + 1} type is invalid`, { [`questions[${i}].type`]: "Type must be MULTIPLE_CHOICE, TEXT, or VOICE" });
    }
    if (q.type === "MULTIPLE_CHOICE") {
      const cleaned = (q.options ?? []).map((s) => (s ?? "").trim()).filter(Boolean);
      if (cleaned.length < 2) {
        throw new ValidationError(`Question ${i + 1} needs at least 2 options`, { [`questions[${i}].options`]: "At least 2 options are required" });
      }
      if (typeof q.correctOptionIndex !== "number" || q.correctOptionIndex < 0 || q.correctOptionIndex >= cleaned.length) {
        throw new ValidationError(`Question ${i + 1} correctOptionIndex is invalid`, { [`questions[${i}].correctOptionIndex`]: "Correct option index is invalid" });
      }
    }
  }

  // Determine quiz type based on questions
  const hasMultipleChoice = questions.some((q) => q.type === "MULTIPLE_CHOICE");
  const hasVoice = questions.some((q) => q.type === "VOICE");
  const quizType: QuizType = hasVoice ? "VOICE" : "MULTIPLE_CHOICE";

  const quiz = await prisma.lessonQuiz.create({
    data: {
      lessonId,
      title: title.trim(),
      type: quizType,
      questions: {
        create: questions.map((q, idx) => {
          const baseQuestion = {
            prompt: q.prompt.trim(),
            type: q.type,
            sortOrder: idx,
          };

          if (q.type === "MULTIPLE_CHOICE") {
            const cleaned = (q.options ?? []).map((s) => (s ?? "").trim()).filter(Boolean);
            return {
              ...baseQuestion,
              options: {
                create: cleaned.map((text, optIdx) => ({
                  text,
                  isCorrect: optIdx === q.correctOptionIndex,
                  sortOrder: optIdx,
                })),
              },
            };
          }

          return baseQuestion;
        }),
      },
    },
  });

  return NextResponse.json({ success: true, quizId: quiz.id });
});
