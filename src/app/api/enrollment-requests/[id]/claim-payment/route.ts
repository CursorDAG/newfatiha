import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { NotificationService } from "@/lib/notification-service";

/**
 * POST /api/enrollment-requests/[id]/claim-payment
 * Студент сообщает, что произвёл оплату вручную.
 * APPROVED_PENDING_PAYMENT -> PAYMENT_PENDING_CONFIRMATION
 */
export const POST = withErrorHandling(async (req: Request, context) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Необходимо войти в систему");
  }

  if (session.user.role !== "STUDENT") {
    throw new ForbiddenError("Только студенты могут сообщать об оплате");
  }

  const params = await context?.params;
  const requestId = params?.id;

  if (!requestId) {
    throw new ValidationError("ID заявки не указан");
  }

  const enrollmentRequest = await prisma.enrollmentRequest.findUnique({
    where: { id: requestId },
    include: {
      student: {
        select: { id: true, name: true },
      },
      stream: {
        include: {
          course: {
            select: { id: true, title: true, teacherId: true },
          },
        },
      },
    },
  });

  if (!enrollmentRequest) {
    throw new NotFoundError("Заявка не найдена");
  }

  // Только владелец заявки
  if (enrollmentRequest.studentId !== session.user.id) {
    throw new ForbiddenError("Вы не можете управлять этой заявкой");
  }

  // Разрешено только из статуса ожидания оплаты
  if (enrollmentRequest.status !== "APPROVED_PENDING_PAYMENT") {
    throw new ValidationError("Заявка не ожидает оплаты");
  }

  const updatedRequest = await prisma.enrollmentRequest.update({
    where: { id: requestId },
    data: { status: "PAYMENT_PENDING_CONFIRMATION" },
  });

  // Уведомить учителя — владельца курса
  await NotificationService.create({
    userId: enrollmentRequest.stream.course.teacherId,
    type: "ENROLLMENT_PAYMENT_CLAIMED",
    title: "Студент сообщил об оплате",
    message: `${enrollmentRequest.student.name || "Студент"} сообщил об оплате курса "${enrollmentRequest.stream.course.title}" (${enrollmentRequest.stream.name}). Подтвердите получение оплаты.`,
    link: `/teacher`,
    priority: "HIGH",
  });

  return NextResponse.json({
    success: true,
    request: updatedRequest,
    message: "Спасибо! Продавец проверит оплату и подтвердит зачисление.",
  });
});
