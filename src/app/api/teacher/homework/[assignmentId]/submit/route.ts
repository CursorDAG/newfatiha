import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { HomeworkSubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { rateLimit, rateLimitConfigs } from "@/lib/rate-limit";
import { NotificationService } from "@/lib/notification-service";
import { logger } from "@/lib/logger";

type SubmitBody = {
  contentText?: string | null;
  contentUrl?: string | null;
  voiceBase64?: string | null;
  voiceMimeType?: string | null;
  voiceDurationMs?: number | null;
};

const MAX_VOICE_BYTES = 7 * 1024 * 1024;

export const POST = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<Record<string, string>> },
) => {
  // Apply rate limiting
  const rateLimitResponse = await rateLimit(req, rateLimitConfigs.homework);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const params = await context!.params;
  const assignmentId = params.assignmentId;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "STUDENT") {
    throw new AuthError("Unauthorized");
  }

  const body = (await req.json().catch(() => null)) as SubmitBody | null;
  if (!body) throw new ValidationError("Invalid JSON");

  const assignment = await prisma.homeworkAssignment.findUnique({
    where: { id: assignmentId },
    include: { stream: true },
  });
  if (!assignment) throw new NotFoundError("Assignment");

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId: session.user.id,
      streamId: assignment.streamId,
    },
  });
  if (!enrollment) {
    throw new ForbiddenError("Not enrolled to this stream");
  }

  // Decode optional voice payload (AUDIO homework)
  let voiceData: Uint8Array | null = null;
  let voiceMimeType: string | null = null;
  let voiceDurationMs: number | null = null;
  if (body.voiceBase64) {
    if (!body.voiceMimeType) throw new ValidationError("voiceMimeType is required with voiceBase64");
    let buf: Buffer;
    try {
      buf = Buffer.from(body.voiceBase64, "base64");
    } catch {
      throw new ValidationError("Invalid voiceBase64");
    }
    if (buf.length === 0) throw new ValidationError("Empty audio");
    if (buf.length > MAX_VOICE_BYTES) throw new ValidationError("Audio too large (max 7MB)");
    voiceData = new Uint8Array(new ArrayBuffer(buf.byteLength));
    voiceData.set(buf);
    voiceMimeType = body.voiceMimeType;
    voiceDurationMs = typeof body.voiceDurationMs === "number" && body.voiceDurationMs > 0
      ? Math.floor(body.voiceDurationMs) : null;
  }

  const submission = await prisma.homeworkSubmission.upsert({
    where: {
      assignmentId_enrollmentId: {
        assignmentId: assignment.id,
        enrollmentId: enrollment.id,
      },
    },
    update: {
      contentText: body.contentText ?? null,
      contentUrl: body.contentUrl ?? null,
      voiceData: voiceData as Uint8Array<ArrayBuffer> | null,
      voiceMimeType,
      voiceDurationMs,
      voiceUrl: null,
      status: HomeworkSubmissionStatus.SUBMITTED,
      submittedAt: new Date(),
      checkedAt: null,
      grade: null,
      teacherComment: null,
    },
    create: {
      assignmentId: assignment.id,
      enrollmentId: enrollment.id,
      contentText: body.contentText ?? null,
      contentUrl: body.contentUrl ?? null,
      voiceData: voiceData as Uint8Array<ArrayBuffer> | null,
      voiceMimeType,
      voiceDurationMs,
      status: HomeworkSubmissionStatus.SUBMITTED,
    },
  });

  // Уведомить учителя о сдаче домашнего задания
  await NotificationService.notifyHomeworkSubmitted(
    submission.id,
    assignment.stream.teacherId
  ).catch((err) => {
    logger.error({ error: err, submissionId: submission.id }, "Failed to send notification");
  });

  return NextResponse.json({ success: true, submissionId: submission.id });
});

