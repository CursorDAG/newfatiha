import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError } from "@/lib/errors";

/**
 * GET /api/admin/dashboard
 * Метрики для админ панели
 */
export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    throw new AuthError("Unauthorized");
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Параллельные запросы для оптимизации
  const [
    totalUsers,
    usersByRole,
    blockedUsers,
    active7days,
    active30days,
    totalCourses,
    totalStreams,
    activeStreams,
    totalLessons,
    lessonsByType,
    activeSessions,
  ] = await Promise.all([
    // Пользователи
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.groupBy({
      by: ["role"],
      where: { deletedAt: null },
      _count: true,
    }),
    prisma.user.count({ where: { isBlocked: true, deletedAt: null } }),
    prisma.user.count({
      where: {
        deletedAt: null,
        activitySessions: {
          some: {
            lastSeenAt: { gte: sevenDaysAgo },
          },
        },
      },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        activitySessions: {
          some: {
            lastSeenAt: { gte: thirtyDaysAgo },
          },
        },
      },
    }),

    // Курсы и потоки
    prisma.course.count(),
    prisma.stream.count(),
    prisma.stream.count({
      where: {
        enrollments: {
          some: {
            status: "ACTIVE",
          },
        },
      },
    }),

    // Уроки
    prisma.lesson.count(),
    prisma.lesson.groupBy({
      by: ["type"],
      _count: true,
    }),

    // Активные Jitsi сессии
    prisma.activitySession.count({
      where: {
        kind: "LIVE_ROOM",
        endedAt: null,
        lastSeenAt: { gte: new Date(now.getTime() - 5 * 60 * 1000) }, // последние 5 минут
      },
    }),
  ]);

  // Преобразование usersByRole в объект
  const roleCount: Record<string, number> = {
    STUDENT: 0,
    TEACHER: 0,
    ADMIN: 0,
    MODERATOR: 0,
  };
  usersByRole.forEach((item) => {
    roleCount[item.role] = item._count;
  });

  // Преобразование lessonsByType в объект
  const lessonTypeCount: Record<string, number> = {
    LIVE: 0,
    VIDEO: 0,
    TEXT: 0,
  };
  lessonsByType.forEach((item) => {
    lessonTypeCount[item.type] = item._count;
  });

  return NextResponse.json({
    users: {
      total: totalUsers,
      byRole: roleCount,
      active7days,
      active30days,
      blocked: blockedUsers,
    },
    courses: {
      total: totalCourses,
      archived: 0, // TODO: добавить поле archivedAt в Course
    },
    streams: {
      total: totalStreams,
      active: activeStreams,
    },
    lessons: {
      total: totalLessons,
      byType: lessonTypeCount,
    },
    storage: {
      dbSize: "N/A", // Требует специального SQL запроса
      s3Size: "N/A", // Требует AWS SDK
    },
    jitsi: {
      activeSessions,
    },
  });
});
