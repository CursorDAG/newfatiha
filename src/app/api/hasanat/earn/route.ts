/**
 * POST /api/hasanat/earn
 *
 * Award hasanat to the current user for completing an action.
 * Idempotent: calling with the same action within 5 minutes is a no-op.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ValidationError } from "@/lib/errors";
import { HASANAT_RATES } from "@/lib/hasanat";

type HasanatType = keyof typeof HASANAT_RATES;

export const POST = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Необходима авторизация");
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    throw new ValidationError("Неверный формат запроса");
  }

  const { type, reason } = body;

  if (!type || !(type in HASANAT_RATES)) {
    throw new ValidationError(
      `Неверный тип действия. Допустимые: ${Object.keys(HASANAT_RATES).join(", ")}`,
    );
  }

  const amount = HASANAT_RATES[type as HasanatType];
  const effectiveReason = reason || `За действие: ${type}`;

  // Check idempotency — only allow one transaction per type per 5 minutes
  const recent = await prisma.hasanatTransaction.findFirst({
    where: {
      userId: session.user.id,
      type: type as HasanatType,
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
  });

  if (recent) {
    return NextResponse.json({
      success: true,
      amount: 0,
      balance: (session.user as { hasanatBalance?: number }).hasanatBalance ?? 0,
      message: "Это действие уже учтено за последние 5 минут",
    });
  }

  // Award hasanat atomically
  const transaction = await prisma.$transaction(async (tx) => {
    const created = await tx.hasanatTransaction.create({
      data: {
        userId: session.user.id,
        type: type as HasanatType,
        amount,
        reason: effectiveReason,
      },
    });

    const updated = await tx.user.update({
      where: { id: session.user.id },
      data: {
        hasanatBalance: { increment: amount },
        totalHasanatEarned: { increment: amount },
      },
      select: { hasanatBalance: true, totalHasanatEarned: true },
    });

    return { transaction: created, balance: updated.hasanatBalance, total: updated.totalHasanatEarned };
  });

  return NextResponse.json({
    success: true,
    amount,
    balance: transaction.balance,
    totalEarned: transaction.total,
  });
});
