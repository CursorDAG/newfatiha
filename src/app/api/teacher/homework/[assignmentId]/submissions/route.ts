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
    select: {
      id: true,
      status: true,
      grade: true,
      teacherComment: true,
      contentText: true,
      contentUrl: true,
      voiceMimeType: true,
      voiceDurationMs: true,
      voiceUrl: true,
      submittedAt: true,
      checkedAt: true,
      enrollmentId: true,
      enrollment: {
        select: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  // hasAudio: check presence of voiceData without loading bytes
  const audioIds = await prisma.homeworkSubmission.findMany({
    where: { assignmentId: assignment.id, voiceData: { not: null } },
    select: { id: true },
  });
  const hasAudioSet = new Set(audioIds.map((x) => x.id));

  const serialized = submissions.map((s) => ({
    id: s.id,
    status: s.status,
    grade: s.grade,
    teacherComment: s.teacherComment,
    contentText: s.contentText,
    contentUrl: s.contentUrl,
    hasAudio: hasAudioSet.has(s.id) || Boolean(s.voiceUrl),
    voiceMimeType: s.voiceMimeType,
    voiceDurationMs: s.voiceDurationMs,
    submittedAt: s.submittedAt,
    checkedAt: s.checkedAt,
    student: {
      enrollmentId: s.enrollmentId,
      userId: s.enrollment.user.id,
      name: s.enrollment.user.name,
      email: s.enrollment.user.email,
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

