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
import { NotificationService } from "@/lib/notification-service";

const MAX_VOICE_BYTES = 7 * 1024 * 1024; // ~7MB

export const POST = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<Record<string, string>> },
) => {
  // Apply rate limiting
  const rateLimitResponse = await rateLimit(req, rateLimitConfigs.quiz);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const params = await context!.params;
  const quizId = params.quizId;
  const session = await getServerSession(authOptions);
  if (!session) throw new AuthError("Unauthorized");

  const quiz = await prisma.lessonQuiz.findUnique({
    where: { id: quizId },
    include: {
      lesson: {
        include: {
          stream: {
            include: {
              enrollments: {
                where: { userId: session.user.id, status: "ACTIVE" },
                select: { id: true },
              },
            },
          },
        },
      },
      questions: { include: { options: true } },
    },
  });

  if (!quiz) throw new NotFoundError("Quiz");

  const isTeacher = session.user.role === "TEACHER" || session.user.role === "ADMIN";
  const isEnrolled = quiz.lesson.stream.enrollments.length > 0;
  if (!isTeacher && !isEnrolled) throw new ForbiddenError("You do not have permission to submit this quiz");

  const body = await req.json().catch(() => null);
  if (!body) throw new ValidationError("Invalid JSON");

  if (quiz.type === "MULTIPLE_CHOICE") {
    const { selectedOptionId }: { selectedOptionId?: string } = body;
    if (!selectedOptionId) {
      throw new ValidationError("selectedOptionId is required", { selectedOptionId: "Option ID is required" });
    }

    const optionExists = quiz.questions.some((q) => q.options.some((o) => o.id === selectedOptionId));
    if (!optionExists) {
      throw new ValidationError("Invalid option", { selectedOptionId: "Invalid option ID" });
    }

    const submission = await prisma.lessonQuizSubmission.upsert({
      where: { quizId_studentId: { quizId: quiz.id, studentId: session.user.id } },
      update: {
        selectedOptionId,
        voiceData: null,
        voiceMimeType: null,
        voiceDurationMs: null,
        status: "SUBMITTED",
        checkedById: null,
        checkedAt: null,
      },
      create: {
        quizId: quiz.id,
        studentId: session.user.id,
        selectedOptionId,
        status: "SUBMITTED",
      },
    });

    // Notify teacher about quiz submission
    await NotificationService.notifyQuizSubmitted(
      submission.id,
      quiz.lesson.stream.teacherId
    ).catch((err) => {
      logger.error({ error: err, submissionId: submission.id }, "Failed to send notification");
    });

    return NextResponse.json({ success: true, submissionId: submission.id });
  }

  if (quiz.type === "VOICE") {
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
        const key = generateVoiceKey(quiz.id, session.user.id, extension);
        voiceUrl = await uploadFile(key, bytes, voiceMimeType);

        logger.info({
          msg: "Voice recording uploaded to S3",
          quizId: quiz.id,
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
        quizId: quiz.id,
        size: bytes.length,
      });
    }

    const submission = await prisma.lessonQuizSubmission.upsert({
      where: { quizId_studentId: { quizId: quiz.id, studentId: session.user.id } },
      update: {
        selectedOptionId: null,
        voiceData: voiceData as Uint8Array<ArrayBuffer> | null,
        voiceUrl,
        voiceMimeType,
        voiceDurationMs: typeof voiceDurationMs === "number" ? Math.max(0, Math.floor(voiceDurationMs)) : null,
        status: "SUBMITTED",
        checkedById: null,
        checkedAt: null,
      },
      create: {
        quizId: quiz.id,
        studentId: session.user.id,
        voiceData: voiceData as Uint8Array<ArrayBuffer> | null,
        voiceUrl,
        voiceMimeType,
        voiceDurationMs: typeof voiceDurationMs === "number" ? Math.max(0, Math.floor(voiceDurationMs)) : null,
        status: "SUBMITTED",
      },
    });

    // Notify teacher about quiz submission
    await NotificationService.notifyQuizSubmitted(
      submission.id,
      quiz.lesson.stream.teacherId
    ).catch((err) => {
      logger.error({ error: err, submissionId: submission.id }, "Failed to send notification");
    });

    return NextResponse.json({ success: true, submissionId: submission.id });
  }

  throw new ValidationError("Unsupported quiz type", { type: "Quiz type not supported" });
});

