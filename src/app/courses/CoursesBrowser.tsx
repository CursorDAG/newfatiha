"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { getStreamGenderTypeLabel } from "@/lib/gender-rules";
import type { StreamGenderType } from "@prisma/client";
import CourseCard from "./CourseCard";

/** Сериализуемые данные курса (поток + курс + учитель + рейтинг). */
export type CourseCardData = {
  id: string; // streamId
  courseId: string;
  courseTitle: string;
  courseDescription: string | null;
  streamName: string;
  level: string;
  color: string;
  genderType: StreamGenderType;
  capacity: number;
  activeEnrollments: number;
  price: number | null;
  currency: string;
  enrollmentDeadline: string | null; // ISO
  createdAt: string; // ISO
  teacherId: string;
  teacherName: string;
  scheduleSlots: Array<{
    dayOfWeek: number;
    startMinutes: number;
    durationMinutes: number;
  }>;
  ratingAverage: number;
  ratingCount: number;
};

type SortKey =
  | "newest"
  | "rating_desc"
  | "price_asc"
  | "price_desc";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "newest", label: "Сначала новые" },
  { value: "rating_desc", label: "По рейтингу" },
  { value: "price_asc", label: "Цена: по возрастанию" },
  { value: "price_desc", label: "Цена: по убыванию" },
];

const GENDER_OPTIONS: Array<{ value: StreamGenderType; label: string }> = [
  { value: "MALE_ONLY" as StreamGenderType, label: getStreamGenderTypeLabel("MALE_ONLY" as StreamGenderType) },
  { value: "FEMALE_ONLY" as StreamGenderType, label: getStreamGenderTypeLabel("FEMALE_ONLY" as StreamGenderType) },
  { value: "MIXED" as StreamGenderType, label: getStreamGenderTypeLabel("MIXED" as StreamGenderType) },
];

type CoursesBrowserProps = {
  courses: CourseCardData[];
  session: { role: string } | null;
};

const selectClass =
  "w-full rounded-xl bg-[#06201A]/60 border border-gold/20 text-cream px-4 py-2.5 text-sm focus:outline-none focus:border-gold/50 transition-colors appearance-none cursor-pointer";

export default function CoursesBrowser({ courses, session }: CoursesBrowserProps) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sort, setSort] = useState<SortKey>("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Уникальные уровни из набора курсов.
  const levels = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => c.level && set.add(c.level));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
  }, [courses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let result = courses.filter((c) => {
      // Поиск по названию курса / потока / учителя.
      if (q) {
        const haystack = `${c.courseTitle} ${c.streamName} ${c.teacherName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (level && c.level !== level) return false;
      if (gender && c.genderType !== gender) return false;
      if (onlyAvailable && c.capacity - c.activeEnrollments <= 0) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      switch (sort) {
        case "rating_desc":
          if (b.ratingAverage !== a.ratingAverage)
            return b.ratingAverage - a.ratingAverage;
          return b.ratingCount - a.ratingCount;
        case "price_asc": {
          // Курсы без цены — в конце.
          const pa = a.price ?? Number.POSITIVE_INFINITY;
          const pb = b.price ?? Number.POSITIVE_INFINITY;
          return pa - pb;
        }
        case "price_desc": {
          const pa = a.price ?? Number.NEGATIVE_INFINITY;
          const pb = b.price ?? Number.NEGATIVE_INFINITY;
          return pb - pa;
        }
        case "newest":
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });

    return result;
  }, [courses, query, level, gender, onlyAvailable, sort]);

  const hasActiveFilters =
    query.trim() !== "" || level !== "" || gender !== "" || onlyAvailable;

  const resetFilters = () => {
    setQuery("");
    setLevel("");
    setGender("");
    setOnlyAvailable(false);
    setSort("newest");
  };

  // Совсем нет открытых курсов.
  if (courses.length === 0) {
    return (
      <div className="glass-card text-center py-20 px-6">
        <div className="text-5xl mb-5 opacity-70">📭</div>
        <h2 className="text-2xl font-bold text-cream mb-2 font-serif">
          Нет доступных курсов
        </h2>
        <p className="text-cream/60">
          В данный момент нет открытых потоков для записи. Загляните позже.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Панель управления */}
      <div className="glass-card p-5 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Поиск */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/60" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по названию, потоку или учителю..."
              className="w-full rounded-xl bg-[#06201A]/60 border border-gold/20 text-cream placeholder-cream/40 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-gold/50 transition-colors"
            />
          </div>

          {/* Сортировка */}
          <div className="lg:w-60">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className={selectClass}
              aria-label="Сортировка"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#06201A]">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Тоггл фильтров (mobile) */}
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="lg:hidden inline-flex items-center justify-center gap-2 rounded-xl border border-gold/30 text-gold px-4 py-2.5 text-sm font-semibold hover:bg-gold/10 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Фильтры
          </button>
        </div>

        {/* Фильтры */}
        <div
          className={`${
            filtersOpen ? "grid" : "hidden"
          } lg:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto] gap-4 mt-4 items-end`}
        >
          {/* Уровень */}
          <div>
            <label className="block text-xs font-semibold text-cream/55 mb-1.5 uppercase tracking-wide">
              Уровень
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className={selectClass}
            >
              <option value="" className="bg-[#06201A]">
                Все уровни
              </option>
              {levels.map((lvl) => (
                <option key={lvl} value={lvl} className="bg-[#06201A]">
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          {/* Тип группы */}
          <div>
            <label className="block text-xs font-semibold text-cream/55 mb-1.5 uppercase tracking-wide">
              Тип группы
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className={selectClass}
            >
              <option value="" className="bg-[#06201A]">
                Любая группа
              </option>
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#06201A]">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Свободные места */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none py-2.5">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="w-4 h-4 rounded border-gold/40 bg-[#06201A] text-gold focus:ring-gold/40 accent-[#D4AF37]"
            />
            <span className="text-sm text-cream/75">Есть свободные места</span>
          </label>

          {/* Сброс */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center justify-center gap-1.5 text-sm text-cream/60 hover:text-gold transition-colors py-2.5"
            >
              <X className="w-4 h-4" />
              Сбросить
            </button>
          )}
        </div>
      </div>

      {/* Счётчик результатов */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-cream/55">
          Найдено: <span className="text-gold font-semibold">{filtered.length}</span>
          {filtered.length !== courses.length && (
            <span className="text-cream/40"> из {courses.length}</span>
          )}
        </p>
      </div>

      {/* Список / пустое состояние */}
      {filtered.length === 0 ? (
        <div className="glass-card text-center py-16 px-6">
          <div className="text-4xl mb-4 opacity-70">🔍</div>
          <h2 className="text-xl font-bold text-cream mb-2 font-serif">
            Ничего не найдено
          </h2>
          <p className="text-cream/60 mb-5">
            Попробуйте изменить условия поиска или сбросить фильтры.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-2 btn-shimmer px-6 py-2.5 rounded-xl text-sm"
          >
            Сбросить фильтры
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((course) => (
            <CourseCard key={course.id} course={course} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
