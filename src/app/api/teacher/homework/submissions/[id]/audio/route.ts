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
  const submissionId = params.id;
  const session = await getServerSession(authOptions);
  if (!session) throw new AuthError("Unauthorized");

  const submission = await prisma.homeworkSubmission.findUnique({
    where: { id: submissionId },
    select: {
      voiceData: true,
      voiceMimeType: true,
      voiceUrl: true,
      enrollment: { select: { userId: true } },
      assignment: { select: { stream: { select: { teacherId: true } } } },
    },
  });
  if (!submission) throw new NotFoundError("Submission");

  const isTeacherOwner = submission.assignment.stream.teacherId === session.user.id;
  const isStudentOwner = submission.enrollment.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isTeacherOwner && !isStudentOwner && !isAdmin) {
    throw new ForbiddenError("You do not have permission to access this audio");
  }

  if (!submission.voiceData || !submission.voiceMimeType) {
    if (submission.voiceUrl) {
      return Response.redirect(submission.voiceUrl, 302);
    }
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
