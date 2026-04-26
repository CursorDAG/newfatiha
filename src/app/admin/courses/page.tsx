"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BookOpen, Users, TrendingUp, AlertCircle, Download } from "lucide-react";

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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Управление курсами</h1>
          <p className="text-slate-600 mt-1 text-sm sm:text-base">Все курсы всех учителей на платформе</p>
        </div>

        <a
          href="/api/admin/export?type=courses"
          download
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Экспорт в CSV
        </a>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <span className="text-sm font-medium text-slate-700 shrink-0">Фильтр:</span>
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
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{courses.length}</p>
                <p className="text-sm text-slate-600">Всего курсов</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {courses.reduce((sum, c) => sum + c.stats.students, 0)}
                </p>
                <p className="text-sm text-slate-600">Всего студентов</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {courses.reduce((sum, c) => sum + c.stats.streams, 0)}
                </p>
                <p className="text-sm text-slate-600">Активных потоков</p>
              </div>
            </div>
          </div>
        </div>

        {/* Courses List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">
              Курсы ({filteredCourses.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-3"></div>
              <p className="text-slate-600">Загрузка...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-red-600 font-medium mb-2">Ошибка загрузки</p>
              <p className="text-slate-600 text-sm mb-4">{error}</p>
              <button
                onClick={fetchCourses}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
              >
                Попробовать снова
              </button>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="p-8 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">Курсов не найдено</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <div
                  key={course.id}
                  className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all duration-200"
                >
                  {/* Превью */}
                  <div className="h-40 bg-gradient-to-br from-emerald-500 to-teal-600 relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-white opacity-50" />
                    </div>
                    {/* Статус бейдж */}
                    <div className="absolute top-3 right-3">
                      {course.published ? (
                        <span className="px-3 py-1 text-xs font-semibold bg-white/90 text-emerald-700 rounded-full backdrop-blur-sm">
                          Опубликован
                        </span>
                      ) : (
                        <span className="px-3 py-1 text-xs font-semibold bg-white/90 text-slate-700 rounded-full backdrop-blur-sm">
                          Черновик
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Контент */}
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                      {course.title}
                    </h3>

                    {course.description && (
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                        {course.description}
                      </p>
                    )}

                    {/* Учитель */}
                    <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                        {course.teacher.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-sm text-slate-600">{course.teacher.name}</div>
                    </div>

                    {/* Статистика */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-slate-900">{course.stats.streams}</div>
                        <div className="text-xs text-slate-500">Потоков</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-emerald-600">{course.stats.students}</div>
                        <div className="text-xs text-slate-500">Студентов</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600">{course.stats.lessons}</div>
                        <div className="text-xs text-slate-500">Уроков</div>
                      </div>
                    </div>

                    {/* Действия */}
                    <div className="flex gap-2">
                      <button className="flex-1 py-2 px-3 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
                        Редактировать
                      </button>
                      <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
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
