"use client";

import React, { useEffect, useState } from "react";

interface StudentProgress {
  userId: string;
  name: string;
  email: string;
  progress: {
    lessonsCompleted: number;
    lessonsTotal: number;
    lessonsPercent: number;
    quizzesPassed: number;
    quizzesTotal: number;
    quizzesPercent: number;
    averageQuizScore: number | null;
    homeworksAccepted: number;
    homeworksTotal: number;
    homeworksPercent: number;
    totalWatchTimeHours: number;
    lastActivityAt?: Date;
  };
}

interface TeacherProgressAnalyticsProps {
  streamId: string;
}

type FilterType = "all" | "struggling" | "average" | "excellent";
type SortField = "name" | "lessons" | "quizzes" | "homeworks" | "score" | "time";

export default function TeacherProgressAnalytics({
  streamId,
}: TeacherProgressAnalyticsProps) {
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [aggregates, setAggregates] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, [streamId]);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/teacher/streams/${streamId}/progress`);
      if (!res.ok) throw new Error("Не удалось загрузить прогресс");
      const data = await res.json();
      setStudents(data.students || []);
      setAggregates(data.aggregates || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  const getFilteredStudents = () => {
    let filtered = students;

    // Apply filter
    if (filter === "struggling") {
      filtered = students.filter((s) => {
        const avg =
          (s.progress.lessonsPercent +
            s.progress.quizzesPercent +
            s.progress.homeworksPercent) /
          3;
        return avg < 50;
      });
    } else if (filter === "average") {
      filtered = students.filter((s) => {
        const avg =
          (s.progress.lessonsPercent +
            s.progress.quizzesPercent +
            s.progress.homeworksPercent) /
          3;
        return avg >= 50 && avg < 80;
      });
    } else if (filter === "excellent") {
      filtered = students.filter((s) => {
        const avg =
          (s.progress.lessonsPercent +
            s.progress.quizzesPercent +
            s.progress.homeworksPercent) /
          3;
        return avg >= 80;
      });
    }

    // Apply sort
    const sorted = [...filtered].sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortField) {
        case "name":
          aVal = a.name;
          bVal = b.name;
          break;
        case "lessons":
          aVal = a.progress.lessonsPercent;
          bVal = b.progress.lessonsPercent;
          break;
        case "quizzes":
          aVal = a.progress.quizzesPercent;
          bVal = b.progress.quizzesPercent;
          break;
        case "homeworks":
          aVal = a.progress.homeworksPercent;
          bVal = b.progress.homeworksPercent;
          break;
        case "score":
          aVal = a.progress.averageQuizScore || 0;
          bVal = b.progress.averageQuizScore || 0;
          break;
        case "time":
          aVal = a.progress.totalWatchTimeHours;
          bVal = b.progress.totalWatchTimeHours;
          break;
        default:
          return 0;
      }

      if (typeof aVal === "string") {
        return sortAsc
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortAsc ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // Default to descending for numeric fields
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Имя",
      "Email",
      "Уроки (%)",
      "Тесты (%)",
      "Средний балл",
      "Домашние задания (%)",
      "Время (ч)",
    ];

    const rows = getFilteredStudents().map((s) => [
      s.name,
      s.email,
      s.progress.lessonsPercent,
      s.progress.quizzesPercent,
      s.progress.averageQuizScore || "—",
      s.progress.homeworksPercent,
      s.progress.totalWatchTimeHours,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `progress-${streamId}-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4" />
          <p className="text-slate-600">Загрузка прогресса...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <p className="text-red-600 font-bold mb-2">Ошибка</p>
        <p className="text-slate-600">{error}</p>
      </div>
    );
  }

  const filteredStudents = getFilteredStudents();

  return (
    <div className="space-y-6">
      {/* Aggregates */}
      {aggregates && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-sm text-slate-500 mb-1">Всего студентов</div>
            <div className="text-3xl font-bold text-slate-800">
              {aggregates.totalStudents}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-sm text-slate-500 mb-1">Средний прогресс</div>
            <div className="text-3xl font-bold text-emerald-600">
              {aggregates.averageLessonsPercent}%
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-sm text-slate-500 mb-1">Средний балл</div>
            <div className="text-3xl font-bold text-blue-600">
              {aggregates.averageQuizScore || "—"}
              {aggregates.averageQuizScore && "%"}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-sm text-slate-500 mb-1">Общее время</div>
            <div className="text-3xl font-bold text-purple-600">
              {aggregates.totalWatchTimeHours}ч
            </div>
          </div>
        </div>
      )}

      {/* Filters and export */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-colors ${
              filter === "all"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Все ({students.length})
          </button>
          <button
            onClick={() => setFilter("struggling")}
            className={`px-3 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-colors ${
              filter === "struggling"
                ? "bg-red-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span className="hidden sm:inline">Отстающие (&lt;50%)</span>
            <span className="sm:hidden">&lt;50%</span>
          </button>
          <button
            onClick={() => setFilter("average")}
            className={`px-3 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-colors ${
              filter === "average"
                ? "bg-amber-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span className="hidden sm:inline">Средние (50-80%)</span>
            <span className="sm:hidden">50-80%</span>
          </button>
          <button
            onClick={() => setFilter("excellent")}
            className={`px-3 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-colors ${
              filter === "excellent"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span className="hidden sm:inline">Лидеры (&gt;80%)</span>
            <span className="sm:hidden">&gt;80%</span>
          </button>
        </div>

        <button
          onClick={exportToCSV}
          className="px-3 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs sm:text-sm transition-colors"
        >
          <span className="hidden sm:inline">📊 Экспорт CSV</span>
          <span className="sm:hidden">📊 CSV</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th
                  onClick={() => handleSort("name")}
                  className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                >
                  Студент {sortField === "name" && (sortAsc ? "↑" : "↓")}
                </th>
                <th
                  onClick={() => handleSort("lessons")}
                  className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                >
                  Уроки {sortField === "lessons" && (sortAsc ? "↑" : "↓")}
                </th>
                <th
                  onClick={() => handleSort("quizzes")}
                  className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                >
                  Тесты {sortField === "quizzes" && (sortAsc ? "↑" : "↓")}
                </th>
                <th
                  onClick={() => handleSort("score")}
                  className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                >
                  Балл {sortField === "score" && (sortAsc ? "↑" : "↓")}
                </th>
                <th
                  onClick={() => handleSort("homeworks")}
                  className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                >
                  ДЗ {sortField === "homeworks" && (sortAsc ? "↑" : "↓")}
                </th>
                <th
                  onClick={() => handleSort("time")}
                  className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                >
                  Время {sortField === "time" && (sortAsc ? "↑" : "↓")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStudents.map((student) => (
                <tr key={student.userId} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800">{student.name}</div>
                    <div className="text-sm text-slate-500">{student.email}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="font-bold text-slate-800">
                      {student.progress.lessonsPercent}%
                    </div>
                    <div className="text-xs text-slate-500">
                      {student.progress.lessonsCompleted}/{student.progress.lessonsTotal}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="font-bold text-slate-800">
                      {student.progress.quizzesPercent}%
                    </div>
                    <div className="text-xs text-slate-500">
                      {student.progress.quizzesPassed}/{student.progress.quizzesTotal}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="font-bold text-slate-800">
                      {student.progress.averageQuizScore || "—"}
                      {student.progress.averageQuizScore && "%"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="font-bold text-slate-800">
                      {student.progress.homeworksPercent}%
                    </div>
                    <div className="text-xs text-slate-500">
                      {student.progress.homeworksAccepted}/{student.progress.homeworksTotal}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="font-bold text-slate-800">
                      {student.progress.totalWatchTimeHours}ч
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p>Нет студентов в этой категории</p>
          </div>
        )}
      </div>
    </div>
  );
}
