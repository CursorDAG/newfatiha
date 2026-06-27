import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { HomeworkSubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { rateLimit, rateLimitConfigs } from "@/lib/rate-limit";
import { NotificationService } from "@/lib/notification-service";
import { recalculateStudentProgress } from "@/lib/progress";
import { awardHasanat } from "@/lib/hasanat-service";
import { logger } from "@/lib/logger";

type CheckBody = {
  status?: HomeworkSubmissionStatus | string;
  grade?: number | null;
  teacherComment?: string | null;
};

export const POST = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<Record<string, string>> },
) => {
  // Apply rate limiting
  const rateLimitResponse = await rateLimit(req, rateLimitConfigs.general);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const params = await context!.params;
  const id = params.id;
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    throw new AuthError("Unauthorized");
  }

  const body = (await req.json().catch(() => null)) as CheckBody | null;
  if (!body) throw new ValidationError("Invalid JSON");

  const submission = await prisma.homeworkSubmission.findUnique({
    where: { id },
    include: {
      assignment: {
        select: { title: true, streamId: true },
      },
    },
  });
  if (!submission) throw new NotFoundError("Submission");

  // Check teacher owns the stream
  if (session.user.role !== "ADMIN") {
    const stream = await prisma.stream.findUnique({
      where: { id: submission.assignment.streamId },
      select: { teacherId: true },
    });
    if (!stream || stream.teacherId !== session.user.id) {
      throw new ForbiddenError("You do not have permission to check this submission");
    }
  }

  let nextStatus: HomeworkSubmissionStatus | undefined;
  if (body.status) {
    if (typeof body.status === "string" && Object.values(HomeworkSubmissionStatus).includes(body.status as HomeworkSubmissionStatus)) {
      nextStatus = body.status as HomeworkSubmissionStatus;
    } else {
      throw new ValidationError("Invalid status", { status: "Status must be SUBMITTED, ACCEPTED, NEEDS_REWORK, or REJECTED" });
    }
  }

  const updated = await prisma.homeworkSubmission.update({
    where: { id: submission.id },
    data: {
      status: nextStatus ?? submission.status,
      grade: typeof body.grade === "number" ? body.grade : submission.grade,
      teacherComment: body.teacherComment ?? submission.teacherComment,
      checkedAt: new Date(),
    },
    include: {
      enrollment: true,
    },
  });

  // Уведомить студента о проверке
  await NotificationService.notifyHomeworkChecked(updated.id).catch((err) => {
    logger.error({ error: err, submissionId: updated.id }, "Failed to send notification");
  });

  // Trigger progress recalculation if homework was accepted
  if (nextStatus === "ACCEPTED") {
    recalculateStudentProgress(
      updated.enrollment.userId,
      submission.assignment.streamId
    ).catch((err) => logger.error({ error: err, userId: updated.enrollment.userId }, "Failed to recalculate progress"));

    // Award hasanat for homework acceptance
    awardHasanat(
      updated.enrollment.userId,
      "HOMEWORK_ACCEPTED",
      `Домашнее задание "${submission.assignment.title}" принято`,
    ).catch((err) => logger.error({ error: err, userId: updated.enrollment.userId }, "Failed to award hasanat"));
  }

  return NextResponse.json({ success: true, submissionId: updated.id, status: updated.status });
});

