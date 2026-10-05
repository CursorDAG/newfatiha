/**
 * GET /api/hasanat/[userId]/transactions
 *
 * Returns the last 50 hasanat transactions for a user.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, ValidationError } from "@/lib/errors";

export const GET = withErrorHandling(async (req: Request, context?: { params: Promise<Record<string, string>> }) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Необходима авторизация");
  }

  const params = await context?.params;
  const userId = params?.userId;

  if (!userId) {
    throw new ValidationError("Не указан userId");
  }

  // Users can only see their own transactions (unless admin)
  if (userId !== session.user.id && session.user.role !== "ADMIN") {
    throw new ForbiddenError("Только просмотр своих транзакций");
  }

  const transactions = await prisma.hasanatTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      amount: true,
      reason: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, transactions });
});
