/**
 * Award hasanat to a user for completing an action.
 * Used by video-heartbeat, homework check, quiz check, review submission, etc.
 */
import { prisma } from "@/lib/prisma";
import { HASANAT_RATES } from "./hasanat";

type HasanatType = keyof typeof HASANAT_RATES;

export async function awardHasanat(
  userId: string,
  type: HasanatType,
  reason: string,
): Promise<{ amount: number; balance: number }> {
  const amount = HASANAT_RATES[type];

  const result = await prisma.$transaction(async (tx) => {
    await tx.hasanatTransaction.create({
      data: { userId, type, amount, reason },
    });

    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        hasanatBalance: { increment: amount },
        totalHasanatEarned: { increment: amount },
      },
      select: { hasanatBalance: true },
    });

    return { amount, balance: updated.hasanatBalance };
  });

  return result;
}
