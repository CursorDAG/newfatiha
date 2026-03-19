import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError } from "@/lib/errors";

/**
 * GET /api/admin/streams
 * Все потоки с фильтрами
 */
export const GET = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    throw new AuthError("Unauthorized");
  }

  const url = new URL(req.url);
  const courseId = url.searchParams.get("courseId");
  const teacherId = url.searchParams.get("teacherId");
  const genderType = url.searchParams.get("genderType");

  const where: {
    courseId?: string;
    course?: { teacherId: string };
    genderType?: "MALE_ONLY" | "FEMALE_ONLY" | "MIXED";
  } = {};

  if (courseId) {
    where.courseId = courseId;
  }

  if (teacherId) {
    where.course = {
      teacherId,
    };
  }

  if (genderType && (genderType === "MALE_ONLY" || genderType === "FEMALE_ONLY" || genderType === "MIXED")) {
    where.genderType = genderType;
  }

  const streams = await prisma.stream.findMany({
    where,
    include: {
      course: {
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          enrollments: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ streams });
});
