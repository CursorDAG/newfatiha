import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  context: { params: Promise<{ submissionId: string }> },
) {
  const { submissionId } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const submission = await prisma.lessonQuizSubmission.findUnique({
    where: { id: submissionId },
    include: { quiz: { include: { lesson: { include: { stream: true } } } } },
  });
  if (!submission) return new Response("Not found", { status: 404 });

  if (session.user.role !== "ADMIN" && submission.quiz.lesson.stream.teacherId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  if (!submission.voiceData || !submission.voiceMimeType) {
    return new Response("No audio", { status: 404 });
  }

  return new Response(submission.voiceData, {
    status: 200,
    headers: {
      "Content-Type": submission.voiceMimeType,
      "Cache-Control": "no-store",
    },
  });
}

