import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ValidationError, ConflictError, ForbiddenError } from "@/lib/errors";
import { validateRequest } from "@/lib/validate-request";
import { createEnrollmentRequestSchema } from "@/lib/validation";
import { canStudentJoinStream } from "@/lib/gender-rules";
import { NotificationService } from "@/lib/notification-service";

/**
 * POST /api/enrollment-requests
 * Submit an enrollment request for a stream
 */
export const POST = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Необходимо войти в систему");
  }

  if (session.user.role !== "STUDENT") {
    throw new ForbiddenError("Только студенты могут подавать заявки");
  }

  const { streamId, message } = await validateRequest(req, createEnrollmentRequestSchema);

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

  // Check capacity
  const availableSpots = stream.course.capacity - stream._count.enrollments;
  if (availableSpots <= 0) {
    throw new ValidationError("Нет свободных мест");
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

  // Check if already enrolled or has pending request
  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      userId_streamId: {
        userId: session.user.id,
        streamId,
      },
    },
  });

  if (existingEnrollment) {
    throw new ConflictError("Вы уже записаны на этот курс");
  }

  const existingRequest = await prisma.enrollmentRequest.findUnique({
    where: {
      studentId_streamId: {
        studentId: session.user.id,
        streamId,
      },
    },
  });

  if (existingRequest) {
    throw new ConflictError("Вы уже подали заявку на этот курс");
  }

  // Create enrollment request
  const enrollmentRequest = await prisma.enrollmentRequest.create({
    data: {
      studentId: session.user.id,
      streamId,
      message,
      status: "PENDING_REVIEW",
    },
  });

  // Notify teacher
  await NotificationService.create({
    userId: stream.course.teacherId,
    type: "ENROLLMENT_REQUEST_SUBMITTED",
    title: "Новая заявка на курс",
    message: `${student.name} подал заявку на курс "${stream.course.title}" (${stream.name})`,
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

/**
 * GET /api/enrollment-requests
 * Get enrollment requests for current user (student sees their own, teacher sees their courses)
 */
export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Необходимо войти в систему");
  }

  if (session.user.role === "STUDENT") {
    // Student sees their own requests
    const requests = await prisma.enrollmentRequest.findMany({
      where: {
        studentId: session.user.id,
      },
      include: {
        stream: {
          include: {
            course: {
              include: {
                teacher: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        reviewedBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ requests });
  } else if (session.user.role === "TEACHER" || session.user.role === "ADMIN") {
    // Teacher sees requests for their courses
    const requests = await prisma.enrollmentRequest.findMany({
      where: {
        stream: {
          course: {
            teacherId: session.user.id,
          },
        },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            gender: true,
            createdAt: true,
          },
        },
        stream: {
          include: {
            course: true,
          },
        },
        reviewedBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ requests });
  }

  throw new ForbiddenError("Недостаточно прав");
});
