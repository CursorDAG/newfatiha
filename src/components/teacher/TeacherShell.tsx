"use client";

import React from "react";
import { signOut } from "next-auth/react";

export type TeacherTabId =
  | "overview"
  | "courses"
  | "schedule"
  | "streams"
  | "lessons"
  | "students"
  | "analytics"
  | "gradebook"
  | "live"
  | "homework";

export default function TeacherShell({
  activeTab,
  onChangeTab,
  header,
  children,
  loading,
}: {
  activeTab: TeacherTabId;
  onChangeTab: (tab: TeacherTabId) => void;
  header: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
}) {
  const tabs: Array<{ id: TeacherTabId; label: string }> = [
    { id: "overview", label: "🏠 Обзор" },
    { id: "courses", label: "📚 Курсы" },
    { id: "streams", label: "🧩 Потоки" },
    { id: "lessons", label: "📖 Уроки" },
    { id: "students", label: "👥 Студенты" },
    { id: "analytics", label: "📈 Аналитика" },
    { id: "gradebook", label: "📓 Журнал" },
    { id: "live", label: "🔴 Live" },
    { id: "homework", label: "📝 Д/З" },
    { id: "schedule", label: "🗓 Расписание" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="bg-white rounded-xl px-6 py-4 shadow-xl flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-700 font-medium">Обработка...</span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto p-6 mt-2 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <nav className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-2 h-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => onChangeTab(t.id)}
              className={`w-full text-left p-3 px-4 rounded-xl transition-colors font-semibold text-sm ${
                activeTab === t.id
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                  : "text-slate-600 hover:bg-slate-50 border border-transparent"
              }`}
            >
              {t.label}
            </button>
          ))}
          <div className="pt-3 border-t border-slate-100 mt-2">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full text-left p-3 px-4 rounded-xl transition-colors font-semibold text-sm text-red-500 hover:bg-red-50 border border-transparent"
            >
              → Выйти
            </button>
          </div>
        </nav>

        <section className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[650px] overflow-hidden flex flex-col">
          <div className="p-5 px-6 border-b border-slate-100">{header}</div>
          <div className="flex-1">{children}</div>
        </section>
      </main>
    </div>
  );
}

