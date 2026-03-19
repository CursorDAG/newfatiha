import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { ValidationError } from "@/lib/errors";
import { rateLimit, rateLimitConfigs } from "@/lib/rate-limit";

export const GET = withErrorHandling(async (req: Request) => {
  // Apply rate limiting to prevent token enumeration
  const rateLimitResponse = await rateLimit(req, rateLimitConfigs.auth);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    throw new ValidationError("Токен не указан");
  }

  const user = await prisma.user.findUnique({
    where: { verificationToken: token },
  });

  if (!user) {
    throw new ValidationError("Неверный или истекший токен");
  }

  if (user.emailVerified) {
    return NextResponse.json({
      success: true,
      message: "Email уже подтвержден",
      alreadyVerified: true,
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
      verificationToken: null,
      status: user.role === "STUDENT" ? "ACTIVE" : user.status,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Email успешно подтвержден. Теперь вы можете войти в систему.",
  });
});
