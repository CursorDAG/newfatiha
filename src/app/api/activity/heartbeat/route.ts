import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ActivityKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const RETENTION_DAYS = 30;

function retentionCutoff() {
  return new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

async function purgeOldActivity() {
  const cutoff = retentionCutoff();
  await prisma.activitySession.deleteMany({
    where: {
      startedAt: { lt: cutoff },
    },
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const {
    sessionId,
    kind,
    streamId,
    lessonId,
    end,
  }: {
    sessionId?: string;
    kind?: ActivityKind;
    streamId?: string;
    lessonId?: string;
    end?: boolean;
  } = body;

  if (!kind || !Object.values(ActivityKind).includes(kind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  await purgeOldActivity();

  const now = new Date();

  if (!sessionId) {
    const created = await prisma.activitySession.create({
      data: {
        userId: session.user.id,
        kind,
        streamId: streamId ?? null,
        lessonId: lessonId ?? null,
        startedAt: now,
        lastSeenAt: now,
        endedAt: end ? now : null,
      },
    });

    return NextResponse.json({ sessionId: created.id });
  }

  const updated = await prisma.activitySession.updateMany({
    where: {
      id: sessionId,
      userId: session.user.id,
    },
    data: {
      lastSeenAt: now,
      endedAt: end ? now : undefined,
    },
  });

  if (updated.count === 0) {
    const created = await prisma.activitySession.create({
      data: {
        id: sessionId,
        userId: session.user.id,
        kind,
        streamId: streamId ?? null,
        lessonId: lessonId ?? null,
        startedAt: now,
        lastSeenAt: now,
        endedAt: end ? now : null,
      },
    });
    return NextResponse.json({ sessionId: created.id });
  }

  return NextResponse.json({ sessionId });
}

