import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

const MAX_VOICE_BYTES = 7 * 1024 * 1024; // ~7MB

export const POST = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<Record<string, string>> },
) => {
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

    const submission = await prisma.lessonQuizSubmission.upsert({
      where: { quizId_studentId: { quizId: quiz.id, studentId: session.user.id } },
      update: {
        selectedOptionId: null,
        voiceData: bytes,
        voiceMimeType,
        voiceDurationMs: typeof voiceDurationMs === "number" ? Math.max(0, Math.floor(voiceDurationMs)) : null,
        status: "SUBMITTED",
        checkedById: null,
        checkedAt: null,
      },
      create: {
        quizId: quiz.id,
        studentId: session.user.id,
        voiceData: bytes,
        voiceMimeType,
        voiceDurationMs: typeof voiceDurationMs === "number" ? Math.max(0, Math.floor(voiceDurationMs)) : null,
        status: "SUBMITTED",
      },
    });

    return NextResponse.json({ success: true, submissionId: submission.id });
  }

  throw new ValidationError("Unsupported quiz type", { type: "Quiz type not supported" });
});

