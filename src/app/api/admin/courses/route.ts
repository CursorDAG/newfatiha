import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError } from "@/lib/errors";

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

  const where: { teacherId?: string } = {};

  if (teacherId) {
    where.teacherId = teacherId;
  }

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
      _count: {
        select: {
          streams: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ courses });
});
