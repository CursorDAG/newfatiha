import RatingStars from "@/components/reviews/RatingStars";
import type { PublicReview } from "@/lib/reviews";

type ReviewListProps = {
  reviews: PublicReview[];
  /** Показывать название курса под отзывом (полезно на профиле преподавателя). */
  showCourse?: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatDate(iso: string): string {
  try {
    return dateFormatter.format(new Date(iso));
  } catch {
    return "";
  }
}

/**
 * Список отзывов: звёзды + текст + имя студента + дата.
 * Тёмно-золотой стиль (для публичных страниц вне .dashboard-content).
 */
export default function ReviewList({ reviews, showCourse = false }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <p className="text-white/55 text-sm">
        Отзывов пока нет. Будьте первым, кто оставит отзыв.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {reviews.map((review) => (
        <li key={review.id} className="glass-card p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="font-semibold text-white truncate">{review.studentName}</p>
              {showCourse && review.courseTitle && (
                <p className="text-xs text-[#D4AF37]/80 mt-0.5 truncate">
                  {review.courseTitle}
                </p>
              )}
            </div>
            <RatingStars value={review.rating} size={16} />
          </div>

          {review.comment && (
            <p className="text-white/75 text-sm mt-3 whitespace-pre-line leading-relaxed">
              {review.comment}
            </p>
          )}

          <p className="text-white/40 text-xs mt-3">{formatDate(review.createdAt)}</p>
        </li>
      ))}
    </ul>
  );
}
