import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { QuizSubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  context: { params: Promise<{ submissionId: string }> },
) {
  const { submissionId } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { status }: { status?: QuizSubmissionStatus } = body;
  if (!status || !Object.values(QuizSubmissionStatus).includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (status === "SUBMITTED") {
    return NextResponse.json({ error: "Use PASSED or FAILED" }, { status: 400 });
  }

  const submission = await prisma.lessonQuizSubmission.findUnique({
    where: { id: submissionId },
    include: { quiz: { include: { lesson: { include: { stream: true } } } } },
  });

  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role !== "ADMIN" && submission.quiz.lesson.stream.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
}

