"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import ReviewForm from "@/components/reviews/ReviewForm";

type CourseReviewBlockProps = {
  courseId: string;
  courseTitle: string;
  /** Существующий отзыв студента, если есть. */
  existingRating?: number;
  existingComment?: string | null;
};

/**
 * Сворачиваемый блок «Оставить отзыв» для карточки курса в кабинете студента.
 * Показывает кнопку, по клику раскрывает ReviewForm. Если отзыв уже есть —
 * показывает текущую оценку и позволяет изменить.
 */
export default function CourseReviewBlock({
  courseId,
  courseTitle,
  existingRating = 0,
  existingComment = null,
}: CourseReviewBlockProps) {
  const hasReview = existingRating > 0;
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100"
        >
          <Star
            className={hasReview ? "w-4 h-4 fill-amber-500 text-amber-500" : "w-4 h-4 text-amber-500"}
          />
          {hasReview ? `Ваш отзыв: ${existingRating}/5 — изменить` : "Оставить отзыв"}
        </button>
      ) : (
        <ReviewForm
          courseId={courseId}
          courseTitle={courseTitle}
          initialRating={existingRating}
          initialComment={existingComment}
        />
      )}
    </div>
  );
}
