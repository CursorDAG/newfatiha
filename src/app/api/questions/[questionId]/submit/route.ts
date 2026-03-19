import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { rateLimit, rateLimitConfigs } from "@/lib/rate-limit";
import {
  uploadFile,
  generateVoiceKey,
  getExtensionFromMimeType,
  isStorageConfigured,
} from "@/lib/storage";
import { logger } from "@/lib/logger";
import { aggregateQuizSubmission, areAllQuestionsAnswered } from "@/lib/quiz-aggregation";

const MAX_VOICE_BYTES = 7 * 1024 * 1024; // ~7MB

export const POST = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<Record<string, string>> }
) => {
  // Apply rate limiting
  const rateLimitResponse = await rateLimit(req, rateLimitConfigs.quiz);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const params = await context!.params;
  const questionId = params.questionId;
  const session = await getServerSession(authOptions);
  if (!session) throw new AuthError("Unauthorized");

  const question = await prisma.lessonQuizQuestion.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      type: true,
      quiz: {
        select: {
          id: true,
          lesson: {
            select: {
              id: true,
              streamId: true,
              stream: {
                select: {
                  id: true,
                  enrollments: {
                    where: { userId: session.user.id, status: "ACTIVE" },
                    select: { id: true },
                  },
                },
              },
            },
          },
        },
      },
      options: {
        select: {
          id: true,
          isCorrect: true,
        },
      },
    },
  });

  if (!question) throw new NotFoundError("Question");

  const isTeacher = session.user.role === "TEACHER" || session.user.role === "ADMIN";
  const isEnrolled = question.quiz.lesson.stream.enrollments.length > 0;
  if (!isTeacher && !isEnrolled) throw new ForbiddenError("You do not have permission to submit this question");

  const body = await req.json().catch(() => null);
  if (!body) throw new ValidationError("Invalid JSON");

  if (question.type === "MULTIPLE_CHOICE") {
    const { selectedOptionId }: { selectedOptionId?: string } = body;
    if (!selectedOptionId) {
      throw new ValidationError("selectedOptionId is required", { selectedOptionId: "Option ID is required" });
    }

    const optionExists = question.options.some((o) => o.id === selectedOptionId);
    if (!optionExists) {
      throw new ValidationError("Invalid option", { selectedOptionId: "Invalid option ID" });
    }

    const submission = await prisma.questionSubmission.upsert({
      where: { questionId_studentId: { questionId: question.id, studentId: session.user.id } },
      update: {
        selectedOptionId,
        textAnswer: null,
        voiceData: null,
        voiceMimeType: null,
        voiceDurationMs: null,
        voiceUrl: null,
        status: "SUBMITTED",
        checkedById: null,
        checkedAt: null,
      },
      create: {
        questionId: question.id,
        studentId: session.user.id,
        selectedOptionId,
        status: "SUBMITTED",
      },
    });

    // Check if all questions are answered and trigger aggregation
    const allAnswered = await areAllQuestionsAnswered(question.quiz.id, session.user.id);
    if (allAnswered) {
      aggregateQuizSubmission(question.quiz.id, session.user.id).catch((err) => {
        logger.error({ msg: "Failed to aggregate quiz submission", error: err, quizId: question.quiz.id, userId: session.user.id });
      });
    }

    return NextResponse.json({ success: true, submissionId: submission.id });
  }

  if (question.type === "TEXT") {
    const { textAnswer }: { textAnswer?: string } = body;
    if (!textAnswer?.trim()) {
      throw new ValidationError("textAnswer is required", { textAnswer: "Text answer is required" });
    }

    const submission = await prisma.questionSubmission.upsert({
      where: { questionId_studentId: { questionId: question.id, studentId: session.user.id } },
      update: {
        selectedOptionId: null,
        textAnswer: textAnswer.trim(),
        voiceData: null,
        voiceMimeType: null,
        voiceDurationMs: null,
        voiceUrl: null,
        status: "SUBMITTED",
        checkedById: null,
        checkedAt: null,
      },
      create: {
        questionId: question.id,
        studentId: session.user.id,
        textAnswer: textAnswer.trim(),
        status: "SUBMITTED",
      },
    });

    // Check if all questions are answered and trigger aggregation
    const allAnswered = await areAllQuestionsAnswered(question.quiz.id, session.user.id);
    if (allAnswered) {
      aggregateQuizSubmission(question.quiz.id, session.user.id).catch((err) => {
        logger.error({ msg: "Failed to aggregate quiz submission", error: err, quizId: question.quiz.id, userId: session.user.id });
      });
    }

    return NextResponse.json({ success: true, submissionId: submission.id });
  }

  if (question.type === "VOICE") {
    const {
      voiceBase64,
      voiceMimeType,
      voiceDurationMs,
    }: { voiceBase64?: string; voiceMimeType?: string; voiceDurationMs?: number } = body;

    if (!voiceBase64 || !voiceMimeType) {
      const errors: Record<string, string> = {};
      if (!voiceBase64) errors.voiceBase64 = "Voice data is required";
      if (!voiceMimeType) errors.voiceMimeType = "Voice MIME type is required";
      throw new ValidationError("voiceBase64 and voiceMimeType are required", errors);
    }

    const bytes = Buffer.from(voiceBase64, "base64");
    if (!bytes.length || bytes.length > MAX_VOICE_BYTES) {
      throw new ValidationError("Invalid voice size", { voiceBase64: "Voice size must be between 1 byte and 7MB" });
    }

    // Try to upload to S3 if configured, otherwise fall back to PostgreSQL
    let voiceUrl: string | null = null;
    let voiceData: Uint8Array | null = null;

    if (isStorageConfigured()) {
      try {
        const extension = getExtensionFromMimeType(voiceMimeType);
        const key = generateVoiceKey(question.id, session.user.id, extension);
        voiceUrl = await uploadFile(key, bytes, voiceMimeType);

        logger.info({
          msg: "Voice recording uploaded to S3",
          questionId: question.id,
          studentId: session.user.id,
          size: bytes.length,
        });
      } catch (error) {
        logger.warn({
          msg: "Failed to upload to S3, falling back to PostgreSQL",
          error: error instanceof Error ? error.message : String(error),
        });
        voiceData = bytes as Uint8Array;
      }
    } else {
      // S3 not configured, store in PostgreSQL
      voiceData = bytes as Uint8Array;
      logger.debug({
        msg: "S3 not configured, storing voice in PostgreSQL",
        questionId: question.id,
        size: bytes.length,
      });
    }

    const submission = await prisma.questionSubmission.upsert({
      where: { questionId_studentId: { questionId: question.id, studentId: session.user.id } },
      update: {
        selectedOptionId: null,
        textAnswer: null,
        voiceData: voiceData as Uint8Array<ArrayBuffer> | null,
        voiceUrl,
        voiceMimeType,
        voiceDurationMs: typeof voiceDurationMs === "number" ? Math.max(0, Math.floor(voiceDurationMs)) : null,
        status: "SUBMITTED",
        checkedById: null,
        checkedAt: null,
      },
      create: {
        questionId: question.id,
        studentId: session.user.id,
        voiceData: voiceData as Uint8Array<ArrayBuffer> | null,
        voiceUrl,
        voiceMimeType,
        voiceDurationMs: typeof voiceDurationMs === "number" ? Math.max(0, Math.floor(voiceDurationMs)) : null,
        status: "SUBMITTED",
      },
    });

    // Check if all questions are answered and trigger aggregation
    const allAnswered = await areAllQuestionsAnswered(question.quiz.id, session.user.id);
    if (allAnswered) {
      aggregateQuizSubmission(question.quiz.id, session.user.id).catch((err) => {
        logger.error({ msg: "Failed to aggregate quiz submission", error: err, quizId: question.quiz.id, userId: session.user.id });
      });
    }

    return NextResponse.json({ success: true, submissionId: submission.id });
  }

  throw new ValidationError("Unsupported question type", { type: "Question type not supported" });
});
