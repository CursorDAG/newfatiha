import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { HomeworkSubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type SubmitBody = {
  contentText?: string | null;
  contentUrl?: string | null;
};

export async function POST(
  req: Request,
  context: { params: Promise<{ assignmentId: string }> },
) {
  const { assignmentId } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as SubmitBody | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const assignment = await prisma.homeworkAssignment.findUnique({
    where: { id: assignmentId },
    include: { stream: true },
  });
  if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId: session.user.id,
      streamId: assignment.streamId,
    },
  });
  if (!enrollment) {
    return NextResponse.json({ error: "Not enrolled to this stream" }, { status: 403 });
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

  return NextResponse.json({ success: true, submissionId: submission.id });
}

