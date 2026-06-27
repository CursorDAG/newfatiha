/**
 * GET /api/leaderboard/[streamId]
 *
 * Returns the top-10 leaderboard for a stream (current ISO week),
 * plus the requesting user's own rank. Access is restricted to
 * the stream's teacher, admins/moderators, or active students of the stream.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { getTopLeaderboard, getUserRank, recomputeLeaderboard } from "@/lib/leaderboard";

export const GET = withErrorHandling(
  async (req: Request, context?: { params: Promise<Record<string, string>> }) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AuthError("Необходима авторизация");
    }

    const params = await context?.params;
    const streamId = params?.streamId;
    if (!streamId) {
      throw new NotFoundError("Поток");
    }

    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
      select: { id: true, teacherId: true },
    });
    if (!stream) {
      throw new NotFoundError("Поток");
    }

    const userId = session.user.id;
    const role = session.user.role;

    // Access control
    const isStaff = role === "ADMIN" || role === "MODERATOR";
    const isTeacher = stream.teacherId === userId;
    let isStudent = false;
    if (!isStaff && !isTeacher) {
      const enrollment = await prisma.enrollment.findFirst({
        where: { userId, streamId, status: "ACTIVE" },
        select: { id: true },
      });
      isStudent = !!enrollment;
    }
    if (!isStaff && !isTeacher && !isStudent) {
      throw new ForbiddenError("У вас нет доступа к этому потоку");
    }

    // Lazily recompute if no entries exist for this week yet.
    let entries = await getTopLeaderboard(streamId, 10);
    if (entries.length === 0) {
      await recomputeLeaderboard(streamId);
      entries = await getTopLeaderboard(streamId, 10);
    }

    const myRank = await getUserRank(streamId, userId);

    return NextResponse.json({
      success: true,
      streamId,
      entries,
      myRank,
    });
  },
);
