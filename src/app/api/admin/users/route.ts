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

  const limit = query.limit || 50;
  const offset = query.offset || 0;

  // Построение фильтров
  const where: {
    deletedAt: null;
    role?: string;
    isBlocked?: boolean;
    OR?: Array<{ email: { contains: string; mode: string } } | { name: { contains: string; mode: string } }>;
  } = {
    deletedAt: null, // Не показываем удаленных пользователей
  };

  if (query.role) {
    where.role = query.role;
  }

  if (query.isBlocked !== undefined) {
    where.isBlocked = query.isBlocked === "true";
  }

  if (query.search) {
    where.OR = [
      { email: { contains: query.search, mode: "insensitive" } },
      { name: { contains: query.search, mode: "insensitive" } },
    ];
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
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
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
