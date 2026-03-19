import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { NotFoundError } from "@/lib/errors";
import { z } from "zod";
import { validateRequest } from "@/lib/validate-request";
import { randomUUID } from "crypto";
import { EmailService } from "@/lib/email-service";
import { logger } from "@/lib/logger";
import { rateLimit, rateLimitConfigs } from "@/lib/rate-limit";

const resendSchema = z.object({
  email: z.string().email("Неверный формат email"),
});

/**
 * POST /api/auth/resend-verification
 * Resend verification email
 */
export const POST = withErrorHandling(async (req: Request) => {
  // Apply rate limiting to prevent email bombing
  const rateLimitResponse = await rateLimit(req, rateLimitConfigs.auth);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { email } = await validateRequest(req, resendSchema);

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    throw new NotFoundError("Пользователь не найден");
  }

  if (user.emailVerified) {
    return NextResponse.json({
      success: true,
      message: "Email уже подтвержден",
      alreadyVerified: true,
    });
  }

  // Generate new verification token
  const verificationToken = randomUUID();

  await prisma.user.update({
    where: { id: user.id },
    data: { verificationToken },
  });

  // Send verification email
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const verificationUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`;

  await EmailService.sendEmailVerification(user.email, {
    userName: user.name,
    verificationUrl,
  });

  logger.info({ userId: user.id, email: user.email }, "Verification email resent");

  return NextResponse.json({
    success: true,
    message: "Письмо с подтверждением отправлено повторно",
  });
});
