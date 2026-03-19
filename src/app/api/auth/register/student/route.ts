import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { ConflictError } from "@/lib/errors";
import { validateRequest } from "@/lib/validate-request";
import { registerUserSchema } from "@/lib/validation";
import { randomBytes } from "crypto";
import { NotificationService } from "@/lib/notification-service";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/register/student
 * Register a new student account
 */
export const POST = withErrorHandling(async (req: Request) => {
  const { email, password, name, gender } = await validateRequest(req, registerUserSchema);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    throw new ConflictError("Пользователь с таким email уже существует");
  }

  // Hash password
  const hashedPassword = await hash(password, 10);

  // Generate verification token
  const verificationToken = randomBytes(32).toString("hex");

  // Create user with PENDING_VERIFICATION status
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      gender,
      role: "STUDENT",
      status: "PENDING_VERIFICATION",
      verificationToken,
      emailVerified: false,
    },
  });

  // TODO: Send verification email
  // await EmailService.sendVerificationEmail(user.email, verificationToken);

  // Notify admins about new student registration
  await NotificationService.notifyStudentRegistered(user.id).catch((err) => {
    logger.error({ error: err, userId: user.id }, "Failed to send notification");
  });

  return NextResponse.json(
    {
      success: true,
      message: "Регистрация успешна. Проверьте email для подтверждения.",
      userId: user.id,
    },
    { status: 201 }
  );
});
