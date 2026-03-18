import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ActivityKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ValidationError } from "@/lib/errors";
import { rateLimit, rateLimitConfigs } from "@/lib/rate-limit";

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

export const POST = withErrorHandling(async (req: Request) => {
  // Apply rate limiting
  const rateLimitResponse = await rateLimit(req, rateLimitConfigs.heartbeat);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const session = await getServerSession(authOptions);
  if (!session) throw new AuthError("Unauthorized");

  const body = await req.json().catch(() => null);
  if (!body) throw new ValidationError("Invalid JSON");

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
    throw new ValidationError("Invalid kind", { kind: "Activity kind is required and must be valid" });
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
});

