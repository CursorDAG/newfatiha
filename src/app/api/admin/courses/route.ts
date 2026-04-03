import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ValidationError } from "@/lib/errors";

/**
 * GET /api/admin/courses
 * Все курсы независимо от учителя
 */
export const GET = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    throw new AuthError("Unauthorized");
  }

  const url = new URL(req.url);
  const teacherId = url.searchParams.get("teacherId");
  const limitParam = url.searchParams.get("limit");
  const offsetParam = url.searchParams.get("offset");

  const where: { teacherId?: string } = {};

  // Валидация teacherId если передан
  if (teacherId) {
    // Проверка формата UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teacherId)) {
      throw new ValidationError("Неверный формат teacherId", {
        teacherId: "Должен быть корректным UUID",
      });
    }
    where.teacherId = teacherId;
  }

  // Пагинация с максимальным лимитом
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 100) : 50;
  const offset = offsetParam ? parseInt(offsetParam, 10) || 0 : 0;

  // TODO: добавить фильтр по archived когда будет поле archivedAt

  const courses = await prisma.course.findMany({
    where,
    include: {
      teacher: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      streams: {
        include: {
          _count: {
            select: {
              enrollments: true,
              lessons: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  // Transform to match frontend expectations
  const coursesWithStats = courses.map((course) => ({
    id: course.id,
    title: course.title,
    description: course.description,
    capacity: course.capacity,
    published: course.published,
    createdAt: course.createdAt,
    teacher: course.teacher,
    stats: {
      streams: course.streams.length,
      students: course.streams.reduce((sum, stream) => sum + stream._count.enrollments, 0),
      lessons: course.streams.reduce((sum, stream) => sum + stream._count.lessons, 0),
    },
  }));

  return NextResponse.json({
    courses: coursesWithStats,
    total: coursesWithStats.length,
    limit,
    offset,
  });
});
