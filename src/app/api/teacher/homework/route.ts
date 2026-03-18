import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { HomeworkType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { rateLimit, rateLimitConfigs } from "@/lib/rate-limit";

type CreateHomeworkBody = {
  streamId?: string;
  lessonId?: string | null;
  title?: string;
  description?: string | null;
  type?: HomeworkType | string;
  dueAt?: string | null;
};

export const POST = withErrorHandling(async (req: Request) => {
  // Apply rate limiting
  const rateLimitResponse = await rateLimit(req, rateLimitConfigs.general);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    throw new AuthError("Unauthorized");
  }

  const body = (await req.json().catch(() => null)) as CreateHomeworkBody | null;
  if (!body) throw new ValidationError("Invalid JSON");

  const { streamId, lessonId, title, description, type, dueAt } = body;
  if (!streamId || !title) {
    const errors: Record<string, string> = {};
    if (!streamId) errors.streamId = "Stream ID is required";
    if (!title) errors.title = "Title is required";
    throw new ValidationError("streamId и title обязательны", errors);
  }

  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { id: true, teacherId: true },
  });

  if (!stream) throw new NotFoundError("Stream");
  if (session.user.role !== "ADMIN" && stream.teacherId !== session.user.id) {
    throw new ForbiddenError("You do not have permission to access this stream");
  }

  const normalizedType: HomeworkType =
    typeof type === "string" && ["TEXT", "AUDIO"].includes(type) ? (type as HomeworkType) : "TEXT";

  let dueAtDate: Date | null = null;
  if (dueAt) {
    const d = new Date(dueAt);
    if (!Number.isNaN(d.getTime())) {
      dueAtDate = d;
    }
  }

  const assignment = await prisma.homeworkAssignment.create({
    data: {
      streamId: stream.id,
      lessonId: lessonId ?? null,
      title: title.trim(),
      description: description?.trim() || null,
      type: normalizedType,
      dueAt: dueAtDate,
    },
  });

  return NextResponse.json({ success: true, assignment });
});

export const GET = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    throw new AuthError("Unauthorized");
  }

  const url = new URL(req.url);
  const streamId = url.searchParams.get("streamId");
  if (!streamId) {
    throw new ValidationError("streamId is required", { streamId: "Stream ID is required" });
  }

  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { id: true, teacherId: true },
  });
  if (!stream) throw new NotFoundError("Stream");
  if (session.user.role !== "ADMIN" && stream.teacherId !== session.user.id) {
    throw new ForbiddenError("You do not have permission to access this stream");
  }

  const assignments = await prisma.homeworkAssignment.findMany({
    where: { streamId },
    orderBy: { createdAt: "desc" },
    include: {
      lesson: { select: { id: true, title: true } },
      submissions: true,
    },
  });

  const serialized = assignments.map((a) => {
    const submitted = a.submissions.length;
    const accepted = a.submissions.filter((s) => s.status === "ACCEPTED").length;
    const needsRework = a.submissions.filter((s) => s.status === "NEEDS_REWORK").length;
    const pending = a.submissions.filter((s) => s.status === "SUBMITTED").length;
    return {
      id: a.id,
      streamId: a.streamId,
      lesson: a.lesson ? { id: a.lesson.id, title: a.lesson.title } : null,
      title: a.title,
      description: a.description,
      type: a.type,
      dueAt: a.dueAt,
      createdAt: a.createdAt,
      submittedCount: submitted,
      acceptedCount: accepted,
      needsReworkCount: needsRework,
      pendingCount: pending,
    };
  });

  return NextResponse.json({ success: true, assignments: serialized });
});

