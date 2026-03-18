import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  context: { params: Promise<{ assignmentId: string }> },
) {
  const { assignmentId } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assignment = await prisma.homeworkAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      stream: { select: { id: true, teacherId: true, name: true } },
    },
  });

  if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  if (session.user.role !== "ADMIN" && assignment.stream.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const submissions = await prisma.homeworkSubmission.findMany({
    where: { assignmentId: assignment.id },
    include: {
      enrollment: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  const serialized = submissions.map((s) => ({
    id: s.id,
    status: s.status,
    grade: s.grade,
    teacherComment: s.teacherComment,
    contentText: s.contentText,
    contentUrl: s.contentUrl,
    submittedAt: s.submittedAt,
    checkedAt: s.checkedAt,
    student: {
      enrollmentId: s.enrollmentId,
      userId: s.enrollment.user.id,
      name: s.enrollment.user.name,
    },
  }));

  return NextResponse.json({
    success: true,
    assignment: {
      id: assignment.id,
      streamId: assignment.streamId,
      streamName: assignment.stream.name,
      title: assignment.title,
      description: assignment.description,
      type: assignment.type,
      dueAt: assignment.dueAt,
    },
    submissions: serialized,
  });
}

