/**
 * GET /api/streak/me
 *
 * Returns the current user's streaks (uses session).
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError } from "@/lib/errors";

export const GET = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Необходима авторизация");
  }

  const streaks = await prisma.streak.findMany({
    where: { userId: session.user.id },
    orderBy: { currentStreak: "desc" },
    select: {
      id: true,
      currentStreak: true,
      maxStreak: true,
      type: true,
      lastActiveDate: true,
    },
  });

  return NextResponse.json({ success: true, streaks });
});
