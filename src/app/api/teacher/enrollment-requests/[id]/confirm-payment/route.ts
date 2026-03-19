import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { NotificationService } from "@/lib/notification-service";

/**
 * POST /api/teacher/enrollment-requests/[id]/confirm-payment
 * Confirm payment and create enrollment
 */
export const POST = withErrorHandling(async (req: Request, context) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Необходимо войти в систему");
  }

  if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
    throw new ForbiddenError("Только учителя могут подтверждать оплату");
  }

  const params = await context?.params;
  const requestId = params?.id;

  if (!requestId) {
    throw new ValidationError("ID заявки не указан");
  }

  // Get enrollment request
  const enrollmentRequest = await prisma.enrollmentRequest.findUnique({
    where: { id: requestId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      stream: {
        include: {
          course: {
            include: {
              teacher: true,
            },
          },
          _count: {
            select: {
              enrollments: {
                where: { status: "ACTIVE" },
              },
            },
          },
        },
      },
    },
  });

  if (!enrollmentRequest) {
    throw new NotFoundError("Заявка не найдена");
  }

  // Verify ownership
  if (enrollmentRequest.stream.course.teacherId !== session.user.id && session.user.role !== "ADMIN") {
    throw new ForbiddenError("Вы не можете управлять этой заявкой");
  }

  // Check status
  if (enrollmentRequest.status !== "APPROVED_PENDING_PAYMENT") {
    throw new ValidationError("Заявка не ожидает подтверждения оплаты");
  }

  // Check capacity
  const availableSpots = enrollmentRequest.stream.course.capacity - enrollmentRequest.stream._count.enrollments;
  if (availableSpots <= 0) {
    throw new ValidationError("Нет свободных мест в группе");
  }

  // Check if enrollment already exists
  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      userId_streamId: {
        userId: enrollmentRequest.studentId,
        streamId: enrollmentRequest.streamId,
      },
    },
  });

  if (existingEnrollment) {
    throw new ValidationError("Студент уже зачислен на этот курс");
  }

  // Create enrollment and update request
  await prisma.$transaction([
    prisma.enrollment.create({
      data: {
        userId: enrollmentRequest.studentId,
        streamId: enrollmentRequest.streamId,
        status: "ACTIVE",
      },
    }),
    prisma.enrollmentRequest.update({
      where: { id: requestId },
      data: {
        status: "ACTIVE",
        paymentConfirmed: true,
        paymentConfirmedAt: new Date(),
      },
    }),
  ]);

  // Notify student
  await NotificationService.create({
    userId: enrollmentRequest.studentId,
    type: "ENROLLMENT_CONFIRMED",
    title: "Оплата подтверждена",
    message: `Вы зачислены на курс "${enrollmentRequest.stream.course.title}" (${enrollmentRequest.stream.name})`,
    link: `/student`,
  });

  // Notify teacher about new student
  await NotificationService.create({
    userId: enrollmentRequest.stream.course.teacherId,
    type: "STUDENT_JOINED",
    title: "Новый студент",
    message: `${enrollmentRequest.student.name} зачислен на курс "${enrollmentRequest.stream.course.title}"`,
    link: `/teacher`,
  });

  return NextResponse.json({
    success: true,
    message: "Оплата подтверждена. Студент зачислен на курс.",
  });
});
