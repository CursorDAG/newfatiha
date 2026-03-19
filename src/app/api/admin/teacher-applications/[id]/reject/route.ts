import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, NotFoundError } from "@/lib/errors";
import { validateRequest } from "@/lib/validate-request";
import { rejectTeacherSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";
import { EmailService } from "@/lib/email-service";
import { NotificationService } from "@/lib/notification-service";

/**
 * POST /api/admin/teacher-applications/[id]/reject
 * Reject teacher application
 */
export const POST = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<Record<string, string>> }
) => {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new AuthError("Доступ запрещен");
  }

  const { rejectionReason, adminNotes } = await validateRequest(req, rejectTeacherSchema);

  if (!context?.params) {
    throw new NotFoundError("Параметры запроса не найдены");
  }

  const params = await context.params;

  // Find teacher application
  const teacher = await prisma.user.findUnique({
    where: { id: params.id },
    include: { teacherProfile: true },
  });

  if (!teacher || teacher.role !== "TEACHER") {
    throw new NotFoundError("Заявка не найдена");
  }

  // Update user status to REJECTED
  await prisma.user.update({
    where: { id: teacher.id },
    data: { status: "REJECTED" },
  });

  // Update teacher profile with rejection info
  if (teacher.teacherProfile) {
    await prisma.teacherProfile.update({
      where: { id: teacher.teacherProfile.id },
      data: {
        reviewedById: session.user.id,
        reviewedAt: new Date(),
        rejectionReason,
        adminNotes: adminNotes || null,
      },
    });
  }

  // Send notification to teacher
  try {
    await NotificationService.create({
      userId: teacher.id,
      type: "TEACHER_APPLICATION_REJECTED",
      title: "Заявка отклонена",
      message: "К сожалению, ваша заявка на должность учителя была отклонена.",
      link: "/auth/register/teacher",
    });

    // Send email
    await EmailService.sendTeacherApplicationRejected(teacher.email, {
      userName: teacher.name,
      reason: rejectionReason,
    });
  } catch (error) {
    logger.error({ error, teacherId: teacher.id }, "Failed to send rejection notification");
  }

  logger.info(
    { teacherId: teacher.id, adminId: session.user.id },
    "Teacher application rejected"
  );

  return NextResponse.json({
    success: true,
    message: "Заявка отклонена",
  });
});
