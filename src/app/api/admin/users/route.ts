import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError } from "@/lib/errors";
import { validateQuery } from "@/lib/validate-request";
import { getUsersQuerySchema } from "@/lib/validation";

/**
 * GET /api/admin/users
 * Список всех пользователей с фильтрами и пагинацией
 */
export const GET = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    throw new AuthError("Unauthorized");
  }

  const query = validateQuery(req, getUsersQuerySchema);

  // Ограничиваем максимальный лимит для защиты от DoS
  const limit = Math.min(query.limit || 50, 100);
  const offset = query.offset || 0;

  // Построение фильтров
  type WhereClause = {
    deletedAt: null;
    role?: "STUDENT" | "TEACHER" | "ADMIN" | "MODERATOR";
    isBlocked?: boolean;
    OR?: Array<{ email: { contains: string; mode: "insensitive" } } | { name: { contains: string; mode: "insensitive" } }>;
  };

  const where: WhereClause = {
    deletedAt: null, // Не показываем удаленных пользователей
  };

  if (query.role && ["STUDENT", "TEACHER", "ADMIN", "MODERATOR"].includes(query.role)) {
    where.role = query.role;
  }

  if (query.isBlocked !== undefined) {
    where.isBlocked = query.isBlocked === "true";
  }

  if (query.search) {
    where.OR = [
      { email: { contains: query.search, mode: "insensitive" as const } },
      { name: { contains: query.search, mode: "insensitive" as const } },
    ];
  }

  // Сортировка
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder || 'desc';

  const orderBy: Record<string, string> = {};
  if (sortBy === 'name' || sortBy === 'email' || sortBy === 'createdAt') {
    orderBy[sortBy] = sortOrder;
  } else {
    orderBy.createdAt = 'desc';
  }

  // Получение пользователей
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        gender: true,
        isBlocked: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy,
      take: limit,
      skip: offset,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users,
    total,
    limit,
    offset,
  });
});
