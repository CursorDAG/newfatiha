import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { EmailService } from "@/lib/email-service";

// Валидация формата UUID
function isValidUuid(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

/**
 * POST /api/admin/users/[userId]/unblock
 * Разблокировка пользователя
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

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isBlocked: false },
    select: {
      id: true,
      email: true,
      name: true,
      isBlocked: true,
    },
  });

  logger.info({ userId, adminId: session.user.id }, "Admin unblocked user");

  // Send notification email
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const loginUrl = `${baseUrl}/auth/signin`;

    await EmailService.sendUserUnblocked(user.email, {
      userName: user.name,
      loginUrl,
    });
    logger.info({ userId, email: user.email }, "User unblocked email sent successfully");
  } catch (error) {
    logger.error({ error, userId }, "Failed to send user unblocked email");
    // Continue even if email fails
  }

  return NextResponse.json({ user });
});
