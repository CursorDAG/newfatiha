/**
 * GET /api/streak/:userId/history
 *
 * Returns the last 30 days of check-in activity for a user.
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
  const userId = url.pathname.split("/")[3];

  if (!userId) {
    throw new ForbiddenError("Не указан ID пользователя");
  }

  if (session.user.id !== userId && session.user.role !== "ADMIN") {
    throw new ForbiddenError("Доступ запрещён");
  }

  const streaks = await prisma.streak.findMany({
    where: { userId },
    orderBy: { currentStreak: "desc" },
    select: {
      type: true,
      currentStreak: true,
      maxStreak: true,
      lastActiveDate: true,
    },
  });

  // Build 30-day history
  const now = new Date();
  const history: { date: string; streaks: Record<string, boolean> }[] = [];

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    history.push({
      date: dateStr,
      streaks: Object.fromEntries(
        streaks.map((s) => {
          const lastActive = new Date(s.lastActiveDate);
          const lastActiveStr = lastActive.toISOString().split("T")[0];
          return [s.type, lastActiveStr === dateStr];
        })
      ),
    });
  }

  return NextResponse.json({ success: true, history });
});
