/**
 * GET /api/chat/users - List users available for direct messaging
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError } from "@/lib/errors";

export const GET = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Unauthorized");
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const userRole = session.user.role;
  const userId = session.user.id;

  type UserResult = {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar: string | null;
  };

  let users: UserResult[] = [];

  // ADMINS can message anyone
  if (userRole === "ADMIN") {
    users = await prisma.user.findMany({
      where: {
        id: { not: userId },
        isBlocked: false,
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      take: 50,
    });
  }

  // TEACHERS can message: their own students, other teachers, admins, moderators
  if (userRole === "TEACHER") {
    // Get teacher's own students (enrolled in their streams)
    const teacherStreams = await prisma.stream.findMany({
      where: { teacherId: userId },
      select: { id: true },
    });

    const streamIds = teacherStreams.map((s) => s.id);

    const studentEnrollments = await prisma.enrollment.findMany({
      where: {
        streamId: { in: streamIds },
        status: "ACTIVE",
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true,
            isBlocked: true,
          },
        },
      },
    });

    const myStudents = studentEnrollments
      .map((e) => e.user)
      .filter((u) => !u.isBlocked);

    // Get all teachers, admins, moderators
    const staff = await prisma.user.findMany({
      where: {
        id: { not: userId },
        isBlocked: false,
        deletedAt: null,
        role: { in: ["TEACHER", "ADMIN", "MODERATOR"] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
      },
    });

    // Combine and deduplicate
    const allUsers = [...myStudents, ...staff];
    const uniqueUsers = Array.from(
      new Map(allUsers.map((u) => [u.id, u])).values()
    );

    // Apply search filter
    users = search
      ? uniqueUsers.filter(
          (u) =>
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
        )
      : uniqueUsers;

    // Sort by role and name
    users.sort((a, b) => {
      const roleOrder = { ADMIN: 0, MODERATOR: 1, TEACHER: 2, STUDENT: 3 };
      const roleCompare =
        (roleOrder[a.role as keyof typeof roleOrder] || 4) -
        (roleOrder[b.role as keyof typeof roleOrder] || 4);
      return roleCompare !== 0 ? roleCompare : a.name.localeCompare(b.name);
    });

    users = users.slice(0, 50);
  }

  // STUDENTS can only message teachers and admins
  if (userRole === "STUDENT") {
    users = await prisma.user.findMany({
      where: {
        id: { not: userId },
        isBlocked: false,
        deletedAt: null,
        role: { in: ["TEACHER", "ADMIN", "MODERATOR"] },
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      take: 50,
    });
  }

  return NextResponse.json({ users });
});
