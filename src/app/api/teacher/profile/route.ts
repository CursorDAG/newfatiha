import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/teacher/profile
 * Updates the authenticated teacher's public profile fields.
 * Body: { name?: string; bio?: string | null; skills?: string[] }
 * At least one field must be present.
 */
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const updateData: Record<string, unknown> = {};

  // name
  if (body?.name !== undefined) {
    const name = (body.name as string).trim();
    if (!name) {
      return NextResponse.json({ error: "Имя не может быть пустым" }, { status: 400 });
    }
    if (name.length > 100) {
      return NextResponse.json({ error: "Имя не должно превышать 100 символов" }, { status: 400 });
    }
    updateData.name = name;
  }

  // bio
  if (body?.bio !== undefined) {
    const bio = body.bio === null ? null : (body.bio as string).trim() || null;
    if (bio && bio.length > 1000) {
      return NextResponse.json({ error: "Биография не должна превышать 1000 символов" }, { status: 400 });
    }
    updateData.bio = bio;
  }

  // skills
  if (body?.skills !== undefined) {
    if (!Array.isArray(body.skills)) {
      return NextResponse.json({ error: "skills должен быть массивом" }, { status: 400 });
    }
    const skills: string[] = (body.skills as unknown[])
      .filter((s) => typeof s === "string" && (s as string).trim().length > 0)
      .map((s) => (s as string).trim())
      .slice(0, 20);
    for (const skill of skills) {
      if (skill.length > 50) {
        return NextResponse.json(
          { error: `Тег «${skill}» превышает 50 символов` },
          { status: 400 },
        );
      }
    }
    updateData.skills = skills;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
  });

  return NextResponse.json({ success: true });
}
