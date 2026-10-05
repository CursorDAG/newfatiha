"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BookOpen, Users, TrendingUp, AlertCircle, Download } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

type Course = {
  id: string;
  title: string;
  description: string | null;
  capacity: number;
  published: boolean;
  createdAt: string;
  teacher: {
    id: string;
    name: string;
    email: string;
  };
  stats: {
    streams: number;
    students: number;
    lessons: number;
  };
};

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter === "published") params.append("published", "true");
      if (filter === "draft") params.append("published", "false");

      const res = await fetch(`/api/admin/courses?${params}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to fetch courses" }));
        throw new Error(errorData.error || "Failed to fetch courses");
      }
      const data = await res.json();
      setCourses(data.courses || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось загрузить курсы");
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const filteredCourses = courses;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Управление курсами</h1>
          <p className="text-emerald-200/70 mt-1 text-sm sm:text-base">Все курсы всех учителей на платформе</p>
        </div>

        <a
          href="/api/admin/export?type=courses"
          download
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#D4AF37] to-[#C49A2B] text-[#06201A] rounded-lg hover:from-[#E8D48B] hover:to-[#D4AF37] transition-all font-bold text-sm shadow-lg shadow-amber-500/20"
        >
          <Download className="w-4 h-4" />
          Экспорт в CSV
        </a>
      </div>

      {/* Filters */}
      <div className="bg-[#0A2820] rounded-xl shadow-sm border border-emerald-800/30 p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <span className="text-sm font-medium text-emerald-200 shrink-0">Фильтр:</span>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "all", label: "Все курсы" },
                { value: "published", label: "Опубликованные" },
                { value: "draft", label: "Черновики" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value as "all" | "published" | "draft")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    filter === option.value
                      ? "bg-gradient-to-r from-[#D4AF37] to-[#C49A2B] text-[#06201A]"
                      : "bg-emerald-800/30 text-emerald-200 hover:bg-emerald-800/50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#0A2820] rounded-xl shadow-sm border border-emerald-800/30 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{courses.length}</p>
                <p className="text-sm text-emerald-200/70">Всего курсов</p>
              </div>
            </div>
          </div>

          <div className="bg-[#0A2820] rounded-xl shadow-sm border border-emerald-800/30 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {courses.reduce((sum, c) => sum + c.stats.students, 0)}
                </p>
                <p className="text-sm text-emerald-200/70">Всего студентов</p>
              </div>
            </div>
          </div>

          <div className="bg-[#0A2820] rounded-xl shadow-sm border border-emerald-800/30 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {courses.reduce((sum, c) => sum + c.stats.streams, 0)}
                </p>
                <p className="text-sm text-emerald-200/70">Активных потоков</p>
              </div>
            </div>
          </div>
        </div>

        {/* Courses List */}
        <div className="bg-[#0A2820] rounded-xl shadow-sm border border-emerald-800/30">
          <div className="p-6 border-b border-emerald-800/30">
            <h2 className="text-xl font-bold text-white">
              Курсы ({filteredCourses.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37] mb-3"></div>
              <p className="text-emerald-200/70">Загрузка...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <p className="text-red-400 font-medium mb-2">Ошибка загрузки</p>
              <p className="text-emerald-200/70 text-sm mb-4">{error}</p>
              <button
                onClick={fetchCourses}
                className="px-4 py-2 bg-gradient-to-r from-[#D4AF37] to-[#C49A2B] text-[#06201A] rounded-lg hover:from-[#E8D48B] hover:to-[#D4AF37] transition-all font-bold text-sm shadow-lg shadow-amber-500/20"
              >
                Попробовать снова
              </button>
            </div>
          ) : filteredCourses.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-16 h-16" />}
              title="Курсов пока нет"
              description={
                filter === "all"
                  ? "Учителя ещё не создали курсы. Как только появится первый курс, он отобразится здесь."
                  : filter === "published"
                  ? "Нет опубликованных курсов. Проверьте раздел черновиков."
                  : "Нет черновиков курсов."
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {filteredCourses.map((course) => (
                <div
                  key={course.id}
                  className="group bg-[#0D3329] rounded-xl border border-emerald-700/30 overflow-hidden hover:shadow-lg hover:shadow-emerald-500/10 hover:border-[#D4AF37]/50 transition-all duration-200"
                >
                  {/* Превью */}
                  <div className="h-40 bg-gradient-to-br from-emerald-600 to-teal-700 relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-white/30" />
                    </div>
                    {/* Статус бейдж */}
                    <div className="absolute top-3 right-3">
                      {course.published ? (
                        <span className="px-3 py-1 text-xs font-semibold bg-emerald-500/90 text-white rounded-full backdrop-blur-sm">
                          Опубликован
                        </span>
                      ) : (
                        <span className="px-3 py-1 text-xs font-semibold bg-slate-500/90 text-white rounded-full backdrop-blur-sm">
                          Черновик
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Контент */}
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-[#D4AF37] transition-colors">
                      {course.title}
                    </h3>

                    {course.description && (
                      <p className="text-sm text-emerald-200/70 mb-3 line-clamp-2">
                        {course.description}
                      </p>
                    )}

                    {/* Учитель */}
                    <div className="flex items-center gap-2 mb-4 pb-4 border-b border-emerald-700/30">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                        {course.teacher.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-sm text-emerald-200/70">{course.teacher.name}</div>
                    </div>

                    {/* Статистика */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-white">{course.stats.streams}</div>
                        <div className="text-xs text-emerald-200/70">Потоков</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-[#D4AF37]">{course.stats.students}</div>
                        <div className="text-xs text-emerald-200/70">Студентов</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-400">{course.stats.lessons}</div>
                        <div className="text-xs text-emerald-200/70">Уроков</div>
                      </div>
                    </div>

                    {/* Действия */}
                    <div className="flex gap-2">
                      <button className="flex-1 py-2 px-3 text-sm font-medium text-[#D4AF37] bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 rounded-lg transition-colors border border-[#D4AF37]/30">
                        Редактировать
                      </button>
                      <button className="p-2 text-emerald-300 hover:bg-emerald-700/30 rounded-lg transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
