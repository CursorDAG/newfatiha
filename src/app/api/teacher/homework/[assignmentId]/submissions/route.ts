import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError } from "@/lib/errors";

export const GET = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<Record<string, string>> },
) => {
  const params = await context!.params;
  const assignmentId = params.assignmentId;
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    throw new AuthError("Unauthorized");
  }

  const assignment = await prisma.homeworkAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      stream: { select: { id: true, teacherId: true, name: true } },
    },
  });

  if (!assignment) throw new NotFoundError("Assignment");
  if (session.user.role !== "ADMIN" && assignment.stream.teacherId !== session.user.id) {
    throw new ForbiddenError("You do not have permission to access this assignment");
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
});

