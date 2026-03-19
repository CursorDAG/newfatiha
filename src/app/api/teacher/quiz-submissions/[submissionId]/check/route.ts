import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { QuizSubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { rateLimit, rateLimitConfigs } from "@/lib/rate-limit";
import { NotificationService } from "@/lib/notification-service";
import { recalculateStudentProgress } from "@/lib/progress";

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
  const submissionId = params.submissionId;
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    throw new AuthError("Unauthorized");
  }

  const body = await req.json().catch(() => null);
  if (!body) throw new ValidationError("Invalid JSON");

  const { status }: { status?: QuizSubmissionStatus } = body;
  if (!status || !Object.values(QuizSubmissionStatus).includes(status)) {
    throw new ValidationError("Invalid status", { status: "Status must be PASSED, FAILED, or SUBMITTED" });
  }

  if (status === "SUBMITTED") {
    throw new ValidationError("Use PASSED or FAILED", { status: "Cannot set status to SUBMITTED" });
  }

  const submission = await prisma.lessonQuizSubmission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      studentId: true,
      status: true,
      quiz: {
        select: {
          id: true,
          lesson: {
            select: {
              id: true,
              stream: {
                select: {
                  id: true,
                  teacherId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!submission) throw new NotFoundError("Submission");

  if (session.user.role !== "ADMIN" && submission.quiz.lesson.stream.teacherId !== session.user.id) {
    throw new ForbiddenError("You do not have permission to check this submission");
  }

  const updated = await prisma.lessonQuizSubmission.update({
    where: { id: submission.id },
    data: {
      status,
      checkedById: session.user.id,
      checkedAt: new Date(),
    },
  });

  // Уведомить студента о проверке
  await NotificationService.notifyQuizChecked(updated.id).catch((err) => {
    console.error("Failed to send notification:", err);
  });

  // Trigger progress recalculation for student
  if (status === "PASSED" || status === "FAILED") {
    recalculateStudentProgress(
      submission.studentId,
      submission.quiz.lesson.stream.id
    ).catch((err) => console.error("Failed to recalculate progress:", err));
  }

  return NextResponse.json({ success: true, submissionId: updated.id, status: updated.status });
});

