import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError } from "@/lib/errors";

/**
 * GET /api/notifications
 * Получить список уведомлений текущего пользователя
 * Query params:
 *   - limit: количество уведомлений (по умолчанию 50)
 *   - unreadOnly: true/false - только непрочитанные
 */
export const GET = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Unauthorized");
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  const notifications = await prisma.notification.findMany({
    where: {
      userId: session.user.id,
      ...(unreadOnly ? { read: false } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    take: Math.min(limit, 100), // Максимум 100 за раз
  });

  // Подсчитать количество непрочитанных
  const unreadCount = await prisma.notification.count({
    where: {
      userId: session.user.id,
      read: false,
    },
  });

  return NextResponse.json({
    notifications,
    unreadCount,
  });
});
