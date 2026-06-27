import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ValidationError, ConflictError, ForbiddenError } from "@/lib/errors";
import { validateRequest } from "@/lib/validate-request";
import { createTrialEnrollmentRequestSchema } from "@/lib/validation";
import { canStudentJoinStream } from "@/lib/gender-rules";
import { NotificationService } from "@/lib/notification-service";

/**
 * POST /api/enrollment-requests/trial
 * Enroll a student in a trial lesson (auto-approved, no payment required)
 */
export const POST = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Необходимо войти в систему");
  }

  if (session.user.role !== "STUDENT") {
    throw new ForbiddenError("Только студенты могут записываться на пробный урок");
  }

  const { streamId } = await validateRequest(req, createTrialEnrollmentRequestSchema);

  // Get stream with course and teacher info
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
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
  });

  if (!stream) {
    throw new ValidationError("Курс не найден");
  }

  // Check if stream is open for enrollment
  if (!stream.isOpenForEnrollment) {
    throw new ValidationError("Запись на этот курс закрыта");
  }

  // Check enrollment deadline
  if (stream.enrollmentDeadline && new Date() > stream.enrollmentDeadline) {
    throw new ValidationError("Срок подачи заявок истек");
  }

  // Get student info
  const student = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { gender: true, email: true, name: true },
  });

  if (!student) {
    throw new AuthError("Пользователь не найден");
  }

  // Check gender compatibility
  const genderCheck = canStudentJoinStream(student.gender, stream.genderType);
  if (!genderCheck.allowed) {
    throw new ForbiddenError(genderCheck.reason || "Вы не можете записаться на этот курс");
  }

  // Block if student already has ACTIVE enrollment in this exact stream
  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      userId_streamId: {
        userId: session.user.id,
        streamId,
      },
    },
  });

  if (existingEnrollment && existingEnrollment.status === "ACTIVE") {
    throw new ConflictError("Вы уже записаны на этот курс");
  }

  // Block if student is already enrolled / has pending request in ANOTHER stream of the SAME course
  const otherStreamIds = await prisma.stream.findMany({
    where: { courseId: stream.courseId, NOT: { id: streamId } },
    select: { id: true },
  });
  const otherStreamIdList = otherStreamIds.map((s) => s.id);
  if (otherStreamIdList.length) {
    const otherActiveEnrollment = await prisma.enrollment.findFirst({
      where: {
        userId: session.user.id,
        streamId: { in: otherStreamIdList },
        status: "ACTIVE",
      },
    });
    if (otherActiveEnrollment) {
      throw new ConflictError("Вы уже записаны на другой поток этого курса");
    }
    const otherPendingRequest = await prisma.enrollmentRequest.findFirst({
      where: {
        studentId: session.user.id,
        streamId: { in: otherStreamIdList },
        status: { in: ["PENDING_REVIEW", "APPROVED_PENDING_PAYMENT", "PAYMENT_CONFIRMED"] },
      },
    });
    if (otherPendingRequest) {
      throw new ConflictError("У вас уже есть активная заявка на другой поток этого курса");
    }
  }

  // Block if already has TRIAL_ATTEMPTED for this stream
  const existingRequest = await prisma.enrollmentRequest.findUnique({
    where: {
      studentId_streamId: {
        studentId: session.user.id,
        streamId,
      },
    },
  });

  if (existingRequest) {
    if (existingRequest.status === "TRIAL_ATTEMPTED") {
      throw new ConflictError("Вы уже записаны на этот курс (пробный урок пройден)");
    }
    if (existingRequest.status === "REJECTED") {
      throw new ConflictError("Ваша предыдущая заявка была отклонена");
    }
    throw new ConflictError("У вас уже есть активная заявка на этот курс");
  }

  // Auto-approve trial enrollment
  const enrollmentRequest = await prisma.enrollmentRequest.create({
    data: {
      studentId: session.user.id,
      streamId,
      message: "Пробный урок",
      status: "TRIAL_ATTEMPTED",
    },
  });

  // Create enrollment with ACTIVE status (free trial)
  await prisma.enrollment.create({
    data: {
      userId: session.user.id,
      streamId,
      status: "ACTIVE",
    },
  });

  // Create student progress
  await prisma.studentProgress.create({
    data: {
      userId: session.user.id,
      streamId,
    },
  });

  // Notify teacher
  await NotificationService.create({
    userId: stream.course.teacherId,
    type: "ENROLLMENT_TRIAL_ATTEMPTED",
    title: "Новый пробный урок",
    message: `${student.name || "Студент"} записался на пробный урок курса "${stream.course.title}" (${stream.name})`,
    link: `/teacher`,
  });

  return NextResponse.json(
    {
      success: true,
      request: enrollmentRequest,
    },
    { status: 201 }
  );
});
