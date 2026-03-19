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
};

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

