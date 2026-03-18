import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { HomeworkType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CreateHomeworkBody = {
  streamId?: string;
  lessonId?: string | null;
  title?: string;
  description?: string | null;
  type?: HomeworkType | string;
  dueAt?: string | null;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as CreateHomeworkBody | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { streamId, lessonId, title, description, type, dueAt } = body;
  if (!streamId || !title) {
    return NextResponse.json({ error: "streamId и title обязательны" }, { status: 400 });
  }

  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { id: true, teacherId: true },
  });

  if (!stream) return NextResponse.json({ error: "Stream not found" }, { status: 404 });
  if (session.user.role !== "ADMIN" && stream.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const streamId = url.searchParams.get("streamId");
  if (!streamId) {
    return NextResponse.json({ error: "streamId is required" }, { status: 400 });
  }

  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { id: true, teacherId: true },
  });
  if (!stream) return NextResponse.json({ error: "Stream not found" }, { status: 404 });
  if (session.user.role !== "ADMIN" && stream.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
}

