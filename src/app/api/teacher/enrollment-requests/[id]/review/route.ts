import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { validateRequest } from "@/lib/validate-request";
import { reviewEnrollmentRequestSchema } from "@/lib/validation";
import { NotificationService } from "@/lib/notification-service";

/**
 * POST /api/teacher/enrollment-requests/[id]/review
 * Approve or reject an enrollment request
 */
export const POST = withErrorHandling(async (req: Request, context) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Необходимо войти в систему");
  }

  if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
    throw new ForbiddenError("Только учителя могут управлять заявками");
  }

  const params = await context?.params;
  const requestId = params?.id;

  if (!requestId) {
    throw new ValidationError("ID заявки не указан");
  }

  const { action, rejectionReason } = await validateRequest(req, reviewEnrollmentRequestSchema);

  // Get enrollment request with stream and course info
  const enrollmentRequest = await prisma.enrollmentRequest.findUnique({
    where: { id: requestId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          gender: true,
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

  // Check if already reviewed
  if (enrollmentRequest.status !== "PENDING_REVIEW") {
    throw new ValidationError("Заявка уже рассмотрена");
  }

  if (action === "APPROVE") {
    // Check capacity
    const availableSpots = enrollmentRequest.stream.course.capacity - enrollmentRequest.stream._count.enrollments;
    if (availableSpots <= 0) {
      throw new ValidationError("Нет свободных мест в группе");
    }

    // Update request status
    const updatedRequest = await prisma.enrollmentRequest.update({
      where: { id: requestId },
      data: {
        status: enrollmentRequest.stream.price ? "APPROVED_PENDING_PAYMENT" : "ACTIVE",
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
    });

    // If no payment required, create enrollment immediately
    if (!enrollmentRequest.stream.price) {
      await prisma.enrollment.create({
        data: {
          userId: enrollmentRequest.studentId,
          streamId: enrollmentRequest.streamId,
          status: "ACTIVE",
        },
      });

      // Update request to ACTIVE
      await prisma.enrollmentRequest.update({
        where: { id: requestId },
        data: { status: "ACTIVE" },
      });

      // Notify student
      await NotificationService.create({
        userId: enrollmentRequest.studentId,
        type: "ENROLLMENT_CONFIRMED",
        title: "Вы зачислены на курс",
        message: `Вы зачислены на курс "${enrollmentRequest.stream.course.title}" (${enrollmentRequest.stream.name})`,
        link: `/student`,
      });
    } else {
      // Notify student about payment
      await NotificationService.create({
        userId: enrollmentRequest.studentId,
        type: "ENROLLMENT_PAYMENT_REQUIRED",
        title: "Заявка одобрена",
        message: `Ваша заявка на курс "${enrollmentRequest.stream.course.title}" одобрена. Необходимо внести оплату.`,
        link: `/student/my-applications`,
      });
    }

    return NextResponse.json({
      success: true,
      request: updatedRequest,
      message: enrollmentRequest.stream.price ? "Заявка одобрена. Ожидается оплата." : "Заявка одобрена. Студент зачислен.",
    });
  } else {
    // REJECT
    if (!rejectionReason) {
      throw new ValidationError("Укажите причину отклонения");
    }

    const updatedRequest = await prisma.enrollmentRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        reviewedById: session.user.id,
        reviewedAt: new Date(),
        rejectionReason,
      },
    });

    // Notify student
    await NotificationService.create({
      userId: enrollmentRequest.studentId,
      type: "ENROLLMENT_REQUEST_REJECTED",
      title: "Заявка отклонена",
      message: `Ваша заявка на курс "${enrollmentRequest.stream.course.title}" отклонена`,
      link: `/student/my-applications`,
    });

    return NextResponse.json({
      success: true,
      request: updatedRequest,
      message: "Заявка отклонена",
    });
  }
});
