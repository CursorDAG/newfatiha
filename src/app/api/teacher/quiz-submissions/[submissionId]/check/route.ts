import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { QuizSubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

export const POST = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<Record<string, string>> },
) => {
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
    include: { quiz: { include: { lesson: { include: { stream: true } } } } },
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

  return NextResponse.json({ success: true, submissionId: updated.id, status: updated.status });
});

