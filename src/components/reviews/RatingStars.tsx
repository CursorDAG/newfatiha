import { Star } from "lucide-react";

type RatingStarsProps = {
  /** Средняя оценка 0..5 (поддерживает дробные — рисует половинки). */
  value: number;
  /** Размер иконки в px. */
  size?: number;
  className?: string;
};

/**
 * Отрисовка средней оценки золотыми звёздами (только для чтения).
 * Поддерживает дробные значения через наложение заполнения по ширине.
 */
export default function RatingStars({ value, size = 20, className }: RatingStarsProps) {
  const clamped = Math.max(0, Math.min(5, value));

  return (
    <div
      className={`inline-flex items-center gap-1 ${className ?? ""}`}
      role="img"
      aria-label={`Оценка ${clamped.toFixed(1)} из 5`}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, clamped - i)); // доля заполнения этой звезды
        return (
          <span
            key={i}
            className="relative inline-block"
            style={{ width: size, height: size }}
          >
            {/* Фон — пустая звезда */}
            <Star
              className="absolute inset-0 text-[#D4AF37]/25"
              style={{ width: size, height: size }}
              strokeWidth={1.5}
            />
            {/* Заполнение */}
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star
                className="text-[#D4AF37] fill-[#D4AF37]"
                style={{ width: size, height: size }}
                strokeWidth={1.5}
              />
            </span>
          </span>
        );
      })}
    </div>
  );
}
