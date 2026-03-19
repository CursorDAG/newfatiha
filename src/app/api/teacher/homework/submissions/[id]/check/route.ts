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
        include: {
          stream: true,
        },
      },
    },
  });
  if (!submission) throw new NotFoundError("Submission");

  if (session.user.role !== "ADMIN" && submission.assignment.stream.teacherId !== session.user.id) {
    throw new ForbiddenError("You do not have permission to check this submission");
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
    console.error("Failed to send notification:", err);
  });

  // Trigger progress recalculation if homework was accepted
  if (nextStatus === "ACCEPTED") {
    recalculateStudentProgress(
      updated.enrollment.userId,
      submission.assignment.streamId
    ).catch((err) => console.error("Failed to recalculate progress:", err));
  }

  return NextResponse.json({ success: true, submissionId: updated.id, status: updated.status });
});

