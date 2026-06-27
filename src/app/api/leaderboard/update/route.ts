/**
 * POST /api/leaderboard/update
 *
 * Recomputes the leaderboard (XP, weekly hasanat, streak, rank) for a stream
 * for the current ISO week. Restricted to the stream's teacher and staff.
 *
 * Body: { streamId: string }
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { recomputeLeaderboard, getTopLeaderboard } from "@/lib/leaderboard";

export const POST = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Необходима авторизация");
  }

  const body = await req.json().catch(() => null);
  const streamId = body?.streamId as string | undefined;
  if (!streamId) {
    throw new ValidationError("Не указан streamId");
  }

  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { id: true, teacherId: true },
  });
  if (!stream) {
    throw new NotFoundError("Поток");
  }

  const role = session.user.role;
  const isStaff = role === "ADMIN" || role === "MODERATOR";
  const isTeacher = stream.teacherId === session.user.id;
  if (!isStaff && !isTeacher) {
    throw new ForbiddenError("Только преподаватель потока может обновлять рейтинг");
  }

  const count = await recomputeLeaderboard(streamId);
  const entries = await getTopLeaderboard(streamId, 10);

  return NextResponse.json({
    success: true,
    streamId,
    participants: count,
    entries,
  });
});
