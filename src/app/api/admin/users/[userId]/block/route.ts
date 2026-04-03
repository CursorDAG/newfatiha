import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { EmailService } from "@/lib/email-service";
import { validateRequest } from "@/lib/validate-request";
import { z } from "zod";

const blockUserSchema = z.object({
  reason: z.string().max(1000).optional(),
});

// Валидация формата UUID
function isValidUuid(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

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

  // Валидация формата UUID
  if (!isValidUuid(userId)) {
    throw new ValidationError("Неверный формат userId", {
      userId: "Должен быть корректным UUID",
    });
  }

  const { reason } = await validateRequest(req, blockUserSchema);

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

  logger.info({ userId, adminId: session.user.id, reason }, "Admin blocked user");

  // Send notification email
  try {
    await EmailService.sendUserBlocked(user.email, {
      userName: user.name,
      reason,
    });
    logger.info({ userId, email: user.email }, "User blocked email sent successfully");
  } catch (error) {
    logger.error({ error, userId }, "Failed to send user blocked email");
    // Continue even if email fails
  }

  return NextResponse.json({ user });
});
