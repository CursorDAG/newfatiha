import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { HomeworkSubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CheckBody = {
  status?: HomeworkSubmissionStatus | string;
  grade?: number | null;
  teacherComment?: string | null;
};

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as CheckBody | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

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
  if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  if (session.user.role !== "ADMIN" && submission.assignment.stream.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let nextStatus: HomeworkSubmissionStatus | undefined;
  if (body.status) {
    if (typeof body.status === "string" && Object.values(HomeworkSubmissionStatus).includes(body.status as any)) {
      nextStatus = body.status as HomeworkSubmissionStatus;
    } else {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
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
  });

  return NextResponse.json({ success: true, submissionId: updated.id, status: updated.status });
}

