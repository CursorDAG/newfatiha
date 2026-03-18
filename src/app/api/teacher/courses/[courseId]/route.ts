import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError, ValidationError, ConflictError } from "@/lib/errors";

type UpdateCourseBody = {
  title?: string;
  description?: string | null;
  capacity?: number;
  published?: boolean;
};

async function getAuthorizedCourse(courseId: string, teacherId: string, role: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      streams: {
        select: {
          _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
        },
      },
    },
  });
  if (!course) throw new NotFoundError("Course");
  if (role !== "ADMIN" && course.teacherId !== teacherId) {
    throw new ForbiddenError("You do not have permission to access this course");
  }
  return course;
}

/** PATCH /api/teacher/courses/[courseId] — update title, description, capacity, published */
export const PATCH = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<Record<string, string>> },
) => {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    throw new AuthError("Unauthorized");
  }

  const params = await context!.params;
  const courseId = params.courseId;

  await getAuthorizedCourse(courseId, session.user.id, session.user.role);

  const body = (await req.json().catch(() => null)) as UpdateCourseBody | null;
  if (!body) throw new ValidationError("Invalid JSON");

  const data: UpdateCourseBody = {};
  if (typeof body.title === "string" && body.title.trim().length > 0)
    data.title = body.title.trim();
  if ("description" in body)
    data.description = body.description?.trim() || null;
  if (typeof body.capacity === "number" && body.capacity > 0)
    data.capacity = Math.floor(body.capacity);
  if (typeof body.published === "boolean") data.published = body.published;

  if (Object.keys(data).length === 0) {
    throw new ValidationError("No fields to update");
  }

  const updated = await prisma.course.update({
    where: { id: courseId },
    data,
  });

  return NextResponse.json({ success: true, course: updated });
});

/** DELETE /api/teacher/courses/[courseId] — delete course if no active enrollments */
export const DELETE = withErrorHandling(async (
  _req: Request,
  context?: { params: Promise<Record<string, string>> },
) => {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    throw new AuthError("Unauthorized");
  }

  const params = await context!.params;
  const courseId = params.courseId;

  const course = await getAuthorizedCourse(courseId, session.user.id, session.user.role);

  const totalActive = course.streams.reduce((sum, s) => sum + s._count.enrollments, 0);
  if (totalActive > 0) {
    throw new ConflictError(
      `Нельзя удалить курс с активными студентами (${totalActive}). Сначала исключите всех учеников.`
    );
  }

  await prisma.course.delete({ where: { id: courseId } });
  return NextResponse.json({ success: true });
});
