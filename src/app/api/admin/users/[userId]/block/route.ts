import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * POST /api/admin/users/[userId]/block
 * Блокировка пользователя
 */
export const POST = withErrorHandling(async (req: Request, context?: { params: Promise<Record<string, string>> }) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    throw new AuthError("Unauthorized");
  }

  const params = await context?.params;
  const userId = params?.userId;

  if (!userId) {
    throw new NotFoundError("User");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isBlocked: true },
    select: {
      id: true,
      email: true,
      name: true,
      isBlocked: true,
    },
  });

  logger.info({ userId, adminId: session.user.id }, "Admin blocked user");

  // TODO: Отправить уведомление пользователю (когда будет email система)

  return NextResponse.json({ user });
});
