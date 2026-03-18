import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

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
  if (!course) return { error: "Course not found", status: 404 as const };
  if (role !== "ADMIN" && course.teacherId !== teacherId)
    return { error: "Forbidden", status: 403 as const };
  return { course };
}

/** PATCH /api/teacher/courses/[courseId] — update title, description, capacity, published */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ courseId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { courseId } = await context.params;

  const result = await getAuthorizedCourse(courseId, session.user.id, session.user.role);
  if ("error" in result)
    return NextResponse.json({ error: result.error }, { status: result.status });

  const body = (await req.json().catch(() => null)) as UpdateCourseBody | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const data: UpdateCourseBody = {};
  if (typeof body.title === "string" && body.title.trim().length > 0)
    data.title = body.title.trim();
  if ("description" in body)
    data.description = body.description?.trim() || null;
  if (typeof body.capacity === "number" && body.capacity > 0)
    data.capacity = Math.floor(body.capacity);
  if (typeof body.published === "boolean") data.published = body.published;

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  const updated = await prisma.course.update({
    where: { id: courseId },
    data,
  });

  return NextResponse.json({ success: true, course: updated });
}

/** DELETE /api/teacher/courses/[courseId] — delete course if no active enrollments */
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ courseId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { courseId } = await context.params;

  const result = await getAuthorizedCourse(courseId, session.user.id, session.user.role);
  if ("error" in result)
    return NextResponse.json({ error: result.error }, { status: result.status });

  const { course } = result;
  const totalActive = course.streams.reduce((sum, s) => sum + s._count.enrollments, 0);
  if (totalActive > 0) {
    return NextResponse.json(
      {
        error: `Нельзя удалить курс с активными студентами (${totalActive}). Сначала исключите всех учеников.`,
      },
      { status: 409 },
    );
  }

  await prisma.course.delete({ where: { id: courseId } });
  return NextResponse.json({ success: true });
}
