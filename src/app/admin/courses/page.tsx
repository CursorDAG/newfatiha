"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { BookOpen, Users, TrendingUp } from "lucide-react";

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
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  useEffect(() => {
    fetchCourses();
  }, [filter, fetchCourses]);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === "published") params.append("published", "true");
      if (filter === "draft") params.append("published", "false");

      const res = await fetch(`/api/admin/courses?${params}`);
      if (!res.ok) throw new Error("Failed to fetch courses");
      const data = await res.json();
      setCourses(data.courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const filteredCourses = courses;

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Управление курсами</h1>
          <p className="text-slate-600 mt-1">Все курсы всех учителей на платформе</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-700">Фильтр:</span>
            <div className="flex gap-2">
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
              <p className="text-slate-600">Загрузка...</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="p-8 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">Курсов не найдено</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Название
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Учитель
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Потоков
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Студентов
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Уроков
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Статус
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredCourses.map((course) => (
                    <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{course.title}</p>
                          {course.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                              {course.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {course.teacher.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {course.stats.streams}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {course.stats.students}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {course.stats.lessons}
                      </td>
                      <td className="px-6 py-4">
                        {course.published ? (
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            Опубликован
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-800 rounded-full">
                            Черновик
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
