import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, NotFoundError } from "@/lib/errors";
import { validateRequest } from "@/lib/validate-request";
import { updateUserSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/users/[userId]
 * Полный профиль пользователя
 */
export const GET = withErrorHandling(async (req: Request, context?: { params: Promise<Record<string, string>> }) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    throw new AuthError("Unauthorized");
  }

  const params = await context?.params;
  const userId = params?.userId;

  if (!userId) {
    throw new NotFoundError("User");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      enrollments: {
        include: {
          stream: {
            include: {
              course: true,
            },
          },
        },
      },
      courses: true,
      activitySessions: {
        orderBy: { startedAt: "desc" },
        take: 10,
      },
    },
  });

  if (!user || user.deletedAt) {
    throw new NotFoundError("User");
  }

  return NextResponse.json({ user });
});

/**
 * PATCH /api/admin/users/[userId]
 * Редактирование пользователя
 */
export const PATCH = withErrorHandling(async (req: Request, context?: { params: Promise<Record<string, string>> }) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    throw new AuthError("Unauthorized");
  }

  const params = await context?.params;
  const userId = params?.userId;

  if (!userId) {
    throw new NotFoundError("User");
  }

  const data = await validateRequest(req, updateUserSchema);

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      gender: true,
      isBlocked: true,
      updatedAt: true,
    },
  });

  logger.info({ userId, adminId: session.user.id, changes: data }, "Admin updated user");

  return NextResponse.json({ user });
});

/**
 * DELETE /api/admin/users/[userId]
 * Soft delete пользователя
 */
export const DELETE = withErrorHandling(async (req: Request, context?: { params: Promise<Record<string, string>> }) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    throw new AuthError("Unauthorized");
  }

  const params = await context?.params;
  const userId = params?.userId;

  if (!userId) {
    throw new NotFoundError("User");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
  });

  logger.info({ userId, adminId: session.user.id }, "Admin deleted user");

  return NextResponse.json({ success: true });
});
