import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { ConflictError } from "@/lib/errors";
import { validateRequest } from "@/lib/validate-request";
import { registerTeacherStep1Schema } from "@/lib/validation";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { EmailService } from "@/lib/email-service";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/register/teacher
 * Step 1: Register teacher account and send verification email
 */
export const POST = withErrorHandling(async (req: Request) => {
  const { email, password, name } = await validateRequest(req, registerTeacherStep1Schema);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    throw new ConflictError("Пользователь с таким email уже существует");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate verification token
  const verificationToken = randomUUID();

  // Create user with PENDING_VERIFICATION status
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role: "TEACHER",
      status: "PENDING_VERIFICATION",
      emailVerified: false,
      verificationToken,
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

    logger.info({ userId: user.id, email: user.email }, "Teacher registration email sent");
  } catch (error) {
    logger.error({ error, userId: user.id }, "Failed to send verification email");
    // Don't throw - user is created, they can resend verification later
  }

  return NextResponse.json({
    success: true,
    message: "Регистрация успешна. Проверьте email для подтверждения адреса.",
    userId: user.id,
  });
});
