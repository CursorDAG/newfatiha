import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ValidationError } from "@/lib/errors";

/**
 * PATCH /api/teacher/profile
 * Updates the authenticated teacher's public profile fields.
 * Body: { name?: string; bio?: string | null; skills?: string[] }
 * At least one field must be present.
 */
export const PATCH = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")
  ) {
    throw new AuthError("Unauthorized");
  }

  const body = await req.json();

  const updateData: Record<string, unknown> = {};

  // name
  if (body?.name !== undefined) {
    const name = (body.name as string).trim();
    if (!name) {
      throw new ValidationError("Имя не может быть пустым", { name: "Name cannot be empty" });
    }
    if (name.length > 100) {
      throw new ValidationError("Имя не должно превышать 100 символов", { name: "Name must not exceed 100 characters" });
    }
    updateData.name = name;
  }

  // bio
  if (body?.bio !== undefined) {
    const bio = body.bio === null ? null : (body.bio as string).trim() || null;
    if (bio && bio.length > 1000) {
      throw new ValidationError("Биография не должна превышать 1000 символов", { bio: "Bio must not exceed 1000 characters" });
    }
    updateData.bio = bio;
  }

  // skills
  if (body?.skills !== undefined) {
    if (!Array.isArray(body.skills)) {
      throw new ValidationError("skills должен быть массивом", { skills: "Skills must be an array" });
    }
    const skills: string[] = (body.skills as unknown[])
      .filter((s) => typeof s === "string" && (s as string).trim().length > 0)
      .map((s) => (s as string).trim())
      .slice(0, 20);
    for (const skill of skills) {
      if (skill.length > 50) {
        throw new ValidationError(`Тег «${skill}» превышает 50 символов`, { skills: `Tag "${skill}" exceeds 50 characters` });
      }
    }
    updateData.skills = skills;
  }

  if (Object.keys(updateData).length === 0) {
    throw new ValidationError("Нет полей для обновления");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
  });

  return NextResponse.json({ success: true });
});
