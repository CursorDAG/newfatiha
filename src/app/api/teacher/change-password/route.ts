import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ValidationError } from "@/lib/errors";

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

  const body = await req.json();
  const currentPassword = (body?.currentPassword ?? "") as string;
  const newPassword = (body?.newPassword ?? "") as string;

  if (!currentPassword || !newPassword) {
    const errors: Record<string, string> = {};
    if (!currentPassword) errors.currentPassword = "Current password is required";
    if (!newPassword) errors.newPassword = "New password is required";
    throw new ValidationError("Заполните все поля", errors);
  }
  if (newPassword.length < 8) {
    throw new ValidationError("Новый пароль должен содержать не менее 8 символов", {
      newPassword: "Password must be at least 8 characters",
    });
  }

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
