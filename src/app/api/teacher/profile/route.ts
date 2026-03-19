import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ValidationError, ForbiddenError } from "@/lib/errors";
import { rateLimit, rateLimitConfigs } from "@/lib/rate-limit";
import { validateRequest } from "@/lib/validate-request";
import { registerTeacherStep2Schema } from "@/lib/validation";
import { NotificationService } from "@/lib/notification-service";

/**
 * POST /api/teacher/profile
 * Creates teacher profile after email verification (Step 2 of registration)
 * Body: { bio, subjects, experience, qualifications, whatsappPhone, documentsUrls, videoIntroUrl? }
 */
export const POST = withErrorHandling(async (req: Request) => {
  // Apply rate limiting
  const rateLimitResponse = await rateLimit(req, rateLimitConfigs.general);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "TEACHER") {
    throw new AuthError("Unauthorized");
  }

  // Check if user has verified email
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true, status: true, teacherProfile: true },
  });

  if (!user) {
    throw new AuthError("User not found");
  }

  if (!user.emailVerified) {
    throw new ForbiddenError("Email must be verified before creating profile");
  }

  if (user.teacherProfile) {
    throw new ValidationError("Profile already exists. Use PATCH to update.");
  }

  // Validate request body
  const data = await validateRequest(req, registerTeacherStep2Schema);

  // Create teacher profile
  await prisma.teacherProfile.create({
    data: {
      userId: session.user.id,
      bio: data.bio,
      subjects: data.subjects,
      experience: data.experience,
      qualifications: data.qualifications,
      whatsappPhone: data.whatsappPhone,
      documentsUrls: data.documentsUrls,
      videoIntroUrl: data.videoIntroUrl || null,
    },
  });

  // Update user status to PENDING_APPROVAL
  await prisma.user.update({
    where: { id: session.user.id },
    data: { status: "PENDING_APPROVAL" },
  });

  // Notify admins about new teacher application
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  for (const admin of admins) {
    await NotificationService.create({
      userId: admin.id,
      type: "TEACHER_APPLICATION_SUBMITTED",
      title: "Новая заявка учителя",
      message: `Учитель ${session.user.name} подал заявку на регистрацию`,
      actionUrl: "/admin/teacher-applications",
      priority: "NORMAL",
    });
  }

  return NextResponse.json({
    success: true,
    message: "Анкета отправлена на рассмотрение администрации",
  });
});

/**
 * PATCH /api/teacher/profile
 * Updates the authenticated teacher's public profile fields.
 * Body: { name?: string; bio?: string | null; skills?: string[]; gender?: string }
 * At least one field must be present.
 */
export const PATCH = withErrorHandling(async (req: Request) => {
  // Apply rate limiting
  const rateLimitResponse = await rateLimit(req, rateLimitConfigs.general);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

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

  // gender
  if (body?.gender !== undefined) {
    const validGenders = ["MALE", "FEMALE", "NOT_SPECIFIED"];
    if (!validGenders.includes(body.gender)) {
      throw new ValidationError("Недопустимое значение пола", { gender: "Invalid gender value" });
    }
    updateData.gender = body.gender;
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
