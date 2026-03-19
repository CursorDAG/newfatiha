import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError } from "@/lib/errors";

/**
 * GET /api/user/me
 * Get current user profile
 */
export const GET = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new AuthError("Необходима авторизация");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      emailVerified: true,
      emailVerifiedAt: true,
      avatar: true,
      bio: true,
      gender: true,
      createdAt: true,
      teacherProfile: {
        select: {
          bio: true,
          subjects: true,
          experience: true,
          qualifications: true,
          whatsappPhone: true,
          documentsUrls: true,
          videoIntroUrl: true,
          reviewedAt: true,
          rejectionReason: true,
        },
      },
    },
  });

  if (!user) {
    throw new AuthError("Пользователь не найден");
  }

  return NextResponse.json({
    success: true,
    user,
  });
});
