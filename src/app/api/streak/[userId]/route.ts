/**
 * GET /api/streak/:userId
 *
 * Returns all streaks for a user (STUDY, READING, HASANAT).
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError } from "@/lib/errors";

export const GET = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Необходима авторизация");
  }

  const url = new URL(req.url);
  const userId = url.pathname.split("/").pop();

  if (!userId) {
    throw new ForbiddenError("Не указан ID пользователя");
  }

  // Users can only view their own streaks
  if (session.user.id !== userId && session.user.role !== "ADMIN") {
    throw new ForbiddenError("Доступ запрещён");
  }

  const streaks = await prisma.streak.findMany({
    where: { userId },
    orderBy: { currentStreak: "desc" },
    select: {
      id: true,
      currentStreak: true,
      maxStreak: true,
      type: true,
      lastActiveDate: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, streaks });
});
