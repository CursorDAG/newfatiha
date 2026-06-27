import { prisma } from "@/lib/prisma";

/**
 * Утилиты агрегации и выборки отзывов.
 * Используются витриной курсов, публичными профилями преподавателей
 * и кабинетом студента. Везде учитываются только PUBLISHED отзывы.
 */

export type RatingSummary = {
  average: number; // средняя оценка, округлённая до 1 знака (0 если отзывов нет)
  count: number; // количество опубликованных отзывов
};

export type PublicReview = {
  id: string;
  rating: number;
  comment: string | null;
  studentName: string;
  courseTitle: string | null;
  createdAt: string; // ISO
};

/** Округление средней оценки до одного знака после запятой. */
function roundAverage(value: number | null | undefined): number {
  if (!value) return 0;
  return Math.round(value * 10) / 10;
}

/** Средний рейтинг и количество опубликованных отзывов по курсу. */
export async function getCourseRating(courseId: string): Promise<RatingSummary> {
  const result = await prisma.review.aggregate({
    where: { courseId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return {
    average: roundAverage(result._avg.rating),
    count: result._count.rating,
  };
}

/** Средний рейтинг и количество опубликованных отзывов по преподавателю. */
export async function getTeacherRating(teacherId: string): Promise<RatingSummary> {
  const result = await prisma.review.aggregate({
    where: { teacherId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return {
    average: roundAverage(result._avg.rating),
    count: result._count.rating,
  };
}

/** Список опубликованных отзывов по курсу (новые сверху). */
export async function getCourseReviews(courseId: string): Promise<PublicReview[]> {
  const reviews = await prisma.review.findMany({
    where: { courseId, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    include: {
      student: { select: { name: true } },
      course: { select: { title: true } },
    },
  });

  return reviews.map(mapReview);
}

/** Список опубликованных отзывов по преподавателю (новые сверху). */
export async function getTeacherReviews(teacherId: string): Promise<PublicReview[]> {
  const reviews = await prisma.review.findMany({
    where: { teacherId, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    include: {
      student: { select: { name: true } },
      course: { select: { title: true } },
    },
  });

  return reviews.map(mapReview);
}

function mapReview(review: {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  student: { name: string | null };
  course: { title: string | null };
}): PublicReview {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    studentName: review.student.name?.trim() || "Студент",
    courseTitle: review.course.title ?? null,
    createdAt: review.createdAt.toISOString(),
  };
}
