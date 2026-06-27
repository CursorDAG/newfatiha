import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { awardHasanat } from "@/lib/hasanat-service";
import { logger } from "@/lib/logger";

/**
 * POST /api/reviews
 * Создание или обновление отзыва студента о курсе.
 *
 * Право оставить отзыв есть только у студента, который записан
 * (имеет Enrollment) на один из потоков курса.
 * Один отзыв на пару (студент, курс) — повторный вызов обновляет существующий.
 */
export const POST = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Необходимо войти в систему");
  }

  if (session.user.role !== "STUDENT") {
    throw new ForbiddenError("Оставлять отзывы могут только студенты");
  }

  const body = (await req.json().catch(() => null)) as
    | { courseId?: unknown; rating?: unknown; comment?: unknown }
    | null;

  if (!body || typeof body.courseId !== "string" || !body.courseId.trim()) {
    throw new ValidationError("Не указан курс");
  }
  const courseId = body.courseId.trim();

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ValidationError("Оценка должна быть от 1 до 5");
  }

  let comment: string | null = null;
  if (body.comment != null) {
    if (typeof body.comment !== "string") {
      throw new ValidationError("Некорректный комментарий");
    }
    const trimmed = body.comment.trim();
    if (trimmed.length > 2000) {
      throw new ValidationError("Комментарий не должен превышать 2000 символов");
    }
    comment = trimmed.length > 0 ? trimmed : null;
  }

  // Курс должен существовать — нужен teacherId для денормализации
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, teacherId: true },
  });
  if (!course) {
    throw new NotFoundError("Курс");
  }

  // Проверка права: студент должен быть записан на поток этого курса
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId: session.user.id,
      stream: { courseId },
    },
    select: { streamId: true },
    orderBy: { createdAt: "desc" },
  });

  if (!enrollment) {
    throw new ValidationError(
      "Оставлять отзыв можно только после записи на курс"
    );
  }

  const review = await prisma.review.upsert({
    where: {
      studentId_courseId: {
        studentId: session.user.id,
        courseId,
      },
    },
    create: {
      studentId: session.user.id,
      courseId,
      teacherId: course.teacherId,
      streamId: enrollment.streamId,
      rating,
      comment,
    },
    update: {
      rating,
      comment,
      // teacherId/streamId обновляем на случай переноса курса между преподавателями
      teacherId: course.teacherId,
      streamId: enrollment.streamId,
    },
  });

  // Award hasanat for leaving a review
  awardHasanat(
    session.user.id,
    "REVIEW_SUBMITTED",
    `Отзыв на курс "${courseId}"`,
  ).catch((err) => logger.error({ error: err, userId: session.user.id }, "Failed to award hasanat for review"));

  return NextResponse.json({
    success: true,
    review: {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
    },
    message: "Спасибо! Ваш отзыв сохранён.",
  });
});
