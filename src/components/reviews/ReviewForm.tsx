"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";

type ReviewFormProps = {
  courseId: string;
  courseTitle?: string;
  /** Текущая оценка студента, если отзыв уже оставлен. */
  initialRating?: number;
  /** Текущий комментарий студента, если отзыв уже оставлен. */
  initialComment?: string | null;
  /** Вызывается после успешного сохранения (опционально). */
  onSaved?: () => void;
};

/**
 * Форма отзыва: интерактивные звёзды 1-5 + комментарий.
 * POST на /api/reviews, затем router.refresh() для обновления данных.
 * Тёмно-золотой стиль.
 */
export default function ReviewForm({
  courseId,
  courseTitle,
  initialRating = 0,
  initialComment = "",
  onSaved,
}: ReviewFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(initialComment ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isEdit = initialRating > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (rating < 1 || rating > 5) {
      setError("Поставьте оценку от 1 до 5 звёзд");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, rating, comment: comment.trim() || null }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? "Не удалось сохранить отзыв");
        return;
      }

      setSuccess(true);
      onSaved?.();
      router.refresh();
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  }

  const active = hover || rating;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/[0.06] p-4 sm:p-5"
    >
      <p className="text-sm font-semibold text-[#D4AF37] mb-1">
        {isEdit ? "Изменить отзыв" : "Оставить отзыв"}
      </p>
      {courseTitle && (
        <p className="text-xs text-white/60 mb-3">Курс: {courseTitle}</p>
      )}

      {/* Звёзды */}
      <div className="flex items-center gap-1 mb-3" role="radiogroup" aria-label="Оценка">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={`${value} из 5`}
            onClick={() => setRating(value)}
            onMouseEnter={() => setHover(value)}
            onMouseLeave={() => setHover(0)}
            className="p-0.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded"
          >
            <Star
              className={
                value <= active
                  ? "w-7 h-7 text-[#D4AF37] fill-[#D4AF37]"
                  : "w-7 h-7 text-[#D4AF37]/30"
              }
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>

      {/* Комментарий */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="Поделитесь впечатлениями о курсе (необязательно)"
        className="w-full rounded-xl border border-[#D4AF37]/25 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[#D4AF37]/60 resize-y"
      />
      <p className="text-right text-[11px] text-white/35 mt-1">{comment.length}/2000</p>

      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
      {success && (
        <p className="text-sm text-emerald-400 mt-2">Отзыв сохранён. Спасибо!</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-3 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#8C6D1F] px-4 py-2 text-sm font-semibold text-[#1a1205] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Сохранение…" : isEdit ? "Обновить отзыв" : "Отправить отзыв"}
      </button>
    </form>
  );
}
