import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { ConflictError } from "@/lib/errors";
import { validateRequest } from "@/lib/validate-request";
import { registerUserSchema } from "@/lib/validation";
import { randomBytes } from "crypto";
import { NotificationService } from "@/lib/notification-service";
import { EmailService } from "@/lib/email-service";
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

  // Send verification email
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`;

    await EmailService.sendEmailVerification(user.email, {
      userName: user.name,
      verificationUrl,
    });

    logger.info({ userId: user.id, email: user.email }, "Student registration email sent");
  } catch (error) {
    logger.error({ error, userId: user.id }, "Failed to send verification email");
    // Don't throw - user is created, they can resend verification later
  }

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
