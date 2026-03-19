import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";

/**
 * GET /api/courses
 * Get list of open courses/streams for enrollment
 */
export const GET = withErrorHandling(async () => {
  const streams = await prisma.stream.findMany({
    where: {
      isOpenForEnrollment: true,
      OR: [
        { enrollmentDeadline: null },
        { enrollmentDeadline: { gte: new Date() } },
      ],
    },
    include: {
      course: {
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              gender: true,
            },
          },
        },
      },
      scheduleSlots: {
        orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }],
      },
      _count: {
        select: {
          enrollments: {
            where: { status: "ACTIVE" },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({ streams });
});
