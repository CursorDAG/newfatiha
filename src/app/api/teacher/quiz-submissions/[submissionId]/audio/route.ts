import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError } from "@/lib/errors";

export const GET = withErrorHandling(async (
  _req: Request,
  context?: { params: Promise<Record<string, string>> },
) => {
  const params = await context!.params;
  const submissionId = params.submissionId;
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    throw new AuthError("Unauthorized");
  }

  const submission = await prisma.lessonQuizSubmission.findUnique({
    where: { id: submissionId },
    include: { quiz: { include: { lesson: { include: { stream: true } } } } },
  });
  if (!submission) throw new NotFoundError("Submission");

  if (session.user.role !== "ADMIN" && submission.quiz.lesson.stream.teacherId !== session.user.id) {
    throw new ForbiddenError("You do not have permission to access this audio");
  }

  if (!submission.voiceData || !submission.voiceMimeType) {
    throw new NotFoundError("No audio");
  }

  return new Response(submission.voiceData, {
    status: 200,
    headers: {
      "Content-Type": submission.voiceMimeType,
      "Cache-Control": "no-store",
    },
  });
});

