import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import bcrypt from "bcryptjs";

/**
 * Генерация временного пароля (8 символов)
 */
function generateTemporaryPassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * POST /api/admin/users/[userId]/reset-password
 * Сброс пароля пользователя
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

  const temporaryPassword = generateTemporaryPassword();
  const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  logger.info({ userId, adminId: session.user.id }, "Admin reset user password");

  // TODO: Отправить временный пароль на email пользователя (когда будет email система)

  return NextResponse.json({
    success: true,
    temporaryPassword,
    message: "Временный пароль сгенерирован. Отправьте его пользователю.",
  });
});
