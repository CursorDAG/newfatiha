/**
 * GET /api/hasanat/[userId]/stats
 *
 * Returns hasanat balance, total earned, and breakdown by type.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, ValidationError } from "@/lib/errors";
import { HASANAT_LABELS } from "@/lib/hasanat";

export const GET = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Необходима авторизация");
  }

  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    throw new ValidationError("Не указан userId");
  }

  if (userId !== session.user.id && session.user.role !== "ADMIN") {
    throw new ForbiddenError("Только просмотр своей статистики");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hasanatBalance: true, totalHasanatEarned: true },
  });

  if (!user) {
    throw new Error("Пользователь не найден");
  }

  const transactions = await prisma.hasanatTransaction.groupBy({
    by: ["type"],
    where: { userId },
    _sum: { amount: true },
    _count: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  });

  const breakdown = transactions.map((t) => ({
    type: t.type,
    label: HASANAT_LABELS[t.type] ?? t.type,
    totalAmount: t._sum.amount ?? 0,
    count: t._count.amount,
  }));

  return NextResponse.json({
    success: true,
    stats: {
      balance: user.hasanatBalance,
      totalEarned: user.totalHasanatEarned,
      breakdown,
    },
  });
});
