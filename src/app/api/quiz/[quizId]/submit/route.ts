import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const MAX_VOICE_BYTES = 7 * 1024 * 1024; // ~7MB

export async function POST(
  req: Request,
  context: { params: Promise<{ quizId: string }> },
) {
  const { quizId } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  const isTeacher = session.user.role === "TEACHER" || session.user.role === "ADMIN";
  const isEnrolled = quiz.lesson.stream.enrollments.length > 0;
  if (!isTeacher && !isEnrolled) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  if (quiz.type === "MULTIPLE_CHOICE") {
    const { selectedOptionId }: { selectedOptionId?: string } = body;
    if (!selectedOptionId) return NextResponse.json({ error: "selectedOptionId is required" }, { status: 400 });

    const optionExists = quiz.questions.some((q) => q.options.some((o) => o.id === selectedOptionId));
    if (!optionExists) return NextResponse.json({ error: "Invalid option" }, { status: 400 });

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
      return NextResponse.json({ error: "voiceBase64 and voiceMimeType are required" }, { status: 400 });
    }

    const bytes = Buffer.from(voiceBase64, "base64");
    if (!bytes.length || bytes.length > MAX_VOICE_BYTES) {
      return NextResponse.json({ error: "Invalid voice size" }, { status: 400 });
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

  return NextResponse.json({ error: "Unsupported quiz type" }, { status: 400 });
}

