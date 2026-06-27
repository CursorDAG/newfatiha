"use client";

import Link from "next/link";
import { Users, CalendarDays, Clock, BadgeRussianRuble } from "lucide-react";
import RatingStars from "@/components/reviews/RatingStars";
import {
  getStreamGenderTypeLabel,
  getStreamGenderTypeIcon,
} from "@/lib/gender-rules";
import type { CourseCardData } from "./CoursesBrowser";

const DAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

function formatSchedule(
  slots: Array<{ dayOfWeek: number; startMinutes: number; durationMinutes: number }>
): string {
  if (slots.length === 0) return "Расписание не указано";

  const grouped = slots.reduce(
    (acc, slot) => {
      if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = [];
      const hours = Math.floor(slot.startMinutes / 60);
      const minutes = slot.startMinutes % 60;
      acc[slot.dayOfWeek].push(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}`
      );
      return acc;
    },
    {} as Record<number, string[]>
  );

  return Object.entries(grouped)
    .map(([day, times]) => `${DAYS[Number(day)]}: ${times.join(", ")}`)
    .join(" • ");
}

type CourseCardProps = {
  course: CourseCardData;
  session: { role: string } | null;
};

export default function CourseCard({ course, session }: CourseCardProps) {
  const availableSpots = course.capacity - course.activeEnrollments;
  const isFull = availableSpots <= 0;
  const filledPct =
    course.capacity > 0
      ? ((course.capacity - availableSpots) / course.capacity) * 100
      : 0;

  return (
    <div className="group glass-card p-0 overflow-hidden flex flex-col">
      {/* Цветная полоса потока */}
      <div className="h-1.5 w-full" style={{ backgroundColor: course.color }} />

      <div className="p-6 flex flex-col flex-1">
        {/* Заголовок курса */}
        <h3 className="text-xl font-bold text-cream mb-2 font-serif group-hover:text-gold transition-colors">
          {course.courseTitle}
        </h3>

        {/* Бейджи: поток + уровень */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-cream/70 border border-white/10">
            {course.streamName}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gold/10 text-gold-light border border-gold/20">
            {course.level}
          </span>
        </div>

        {/* Рейтинг */}
        <div className="flex items-center gap-2 mb-3">
          {course.ratingCount > 0 ? (
            <>
              <RatingStars value={course.ratingAverage} size={16} />
              <span className="text-sm font-bold text-gold">
                {course.ratingAverage.toFixed(1)}
              </span>
              <span className="text-xs text-cream/50">
                ({course.ratingCount}{" "}
                {course.ratingCount === 1
                  ? "отзыв"
                  : course.ratingCount < 5
                    ? "отзыва"
                    : "отзывов"}
                )
              </span>
            </>
          ) : (
            <span className="text-xs text-cream/40">Пока нет отзывов</span>
          )}
        </div>

        {/* Описание */}
        {course.courseDescription && (
          <p className="text-cream/60 text-sm leading-relaxed mb-4 line-clamp-3">
            {course.courseDescription}
          </p>
        )}

        {/* Учитель */}
        <div className="flex items-center gap-2 mb-2 text-sm text-cream/60">
          <Users className="w-4 h-4 text-gold/70 shrink-0" strokeWidth={1.75} />
          <span>
            Учитель:{" "}
            <Link
              href={`/teachers/${course.teacherId}`}
              className="font-semibold text-gold hover:text-gold-light hover:underline"
            >
              {course.teacherName}
            </Link>
          </span>
        </div>

        {/* Тип группы */}
        <div className="flex items-center gap-2 mb-2 text-sm text-cream/60">
          <span className="text-gold/80">
            {getStreamGenderTypeIcon(course.genderType)}
          </span>
          <span>{getStreamGenderTypeLabel(course.genderType)}</span>
        </div>

        {/* Расписание */}
        <div className="flex items-start gap-2 mb-2 text-sm text-cream/60">
          <CalendarDays
            className="w-4 h-4 text-gold/70 shrink-0 mt-0.5"
            strokeWidth={1.75}
          />
          <span className="text-xs leading-relaxed">
            {formatSchedule(course.scheduleSlots)}
          </span>
        </div>

        {/* Цена */}
        {course.price != null && (
          <div className="flex items-center gap-2 mb-4 mt-1">
            <BadgeRussianRuble
              className="w-4 h-4 text-gold/70 shrink-0"
              strokeWidth={1.75}
            />
            <span className="text-lg font-bold text-gold font-serif">
              {course.price.toLocaleString("ru-RU")} {course.currency}
            </span>
          </div>
        )}

        {/* Свободные места */}
        <div className="mb-4 mt-auto pt-2">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-cream/55">Свободных мест:</span>
            <span
              className={`font-bold ${isFull ? "text-red-400" : "text-gold"}`}
            >
              {Math.max(0, availableSpots)} из {course.capacity}
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all ${
                isFull
                  ? "bg-red-500/80"
                  : "bg-gradient-to-r from-gold to-[#8C6D1F]"
              }`}
              style={{ width: `${filledPct}%` }}
            />
          </div>
        </div>

        {/* Дедлайн */}
        {course.enrollmentDeadline && (
          <div className="flex items-center gap-1.5 mb-4 text-xs text-cream/50">
            <Clock className="w-3.5 h-3.5 text-gold/60" strokeWidth={1.75} />
            Запись до:{" "}
            {new Date(course.enrollmentDeadline).toLocaleDateString("ru-RU")}
          </div>
        )}

        {/* Кнопка действия */}
        {session ? (
          session.role === "STUDENT" ? (
            <Link
              href={`/courses/${course.id}/apply`}
              className={`block w-full text-center py-3 rounded-xl font-bold transition-all ${
                isFull
                  ? "bg-white/5 text-cream/40 cursor-not-allowed pointer-events-none border border-white/10"
                  : "btn-shimmer hover:-translate-y-px"
              }`}
              aria-disabled={isFull}
            >
              {isFull ? "Мест нет" : "Подать заявку"}
            </Link>
          ) : (
            <div className="text-center text-sm text-cream/45 py-3 border border-white/10 rounded-xl">
              Доступно только для студентов
            </div>
          )
        ) : (
          <Link
            href="/auth/register/student"
            className="block w-full text-center py-3 btn-shimmer rounded-xl font-bold transition-all hover:-translate-y-px"
          >
            Зарегистрироваться
          </Link>
        )}
      </div>
    </div>
  );
}
