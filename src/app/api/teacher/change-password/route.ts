import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ValidationError } from "@/lib/errors";
import { validateRequest } from "@/lib/validate-request";
import { changePasswordSchema } from "@/lib/validation";

/**
 * POST /api/teacher/change-password
 * Changes the authenticated teacher's password.
 * Body: { currentPassword: string; newPassword: string }
 */
export const POST = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")
  ) {
    throw new AuthError("Unauthorized");
  }

  // Validate request body with Zod
  const { currentPassword, newPassword } = await validateRequest(req, changePasswordSchema);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });

  if (!user?.password) {
    throw new ValidationError("Для этого аккаунта пароль не установлен", {
      currentPassword: "No password set for this account",
    });
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new ValidationError("Текущий пароль введён неверно", {
      currentPassword: "Current password is incorrect",
    });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed },
  });

  return NextResponse.json({ success: true });
});
