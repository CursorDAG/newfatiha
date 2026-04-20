"use client";

import React, { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { teacherSteps } from "@/components/onboarding/teacherSteps";
// import { OnboardingTooltip } from "@/components/onboarding/OnboardingTooltip"; // Временно отключено - блокирует экран
import {
  Home,
  BookOpen,
  Users,
  GraduationCap,
  BarChart3,
  TrendingUp,
  ClipboardCheck,
  Video,
  FileText,
  Calendar,
  LogOut,
  Menu,
  X,
  Info,
  UserPlus,
} from "lucide-react";

export type TeacherTabId =
  | "overview"
  | "courses"
  | "schedule"
  | "streams"
  | "lessons"
  | "students"
  | "analytics"
  | "progress"
  | "gradebook"
  | "live"
  | "homework"
  | "applications"
  | "info";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { startOnboarding, isCompleted, resetOnboarding } = useOnboarding();

  useEffect(() => {
    if (!isCompleted) {
      const timer = setTimeout(() => {
        startOnboarding(teacherSteps);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isCompleted, startOnboarding]);

  const handleRestartOnboarding = () => {
    resetOnboarding();
    startOnboarding(teacherSteps);
  };

  const tabs: Array<{ id: TeacherTabId; label: string; icon: React.ReactNode }> = [
    { id: "overview", label: "Обзор", icon: <Home className="w-5 h-5" /> },
    { id: "courses", label: "Курсы", icon: <BookOpen className="w-5 h-5" /> },
    { id: "streams", label: "Потоки", icon: <Users className="w-5 h-5" /> },
    { id: "lessons", label: "Уроки", icon: <GraduationCap className="w-5 h-5" /> },
    { id: "students", label: "Студенты", icon: <Users className="w-5 h-5" /> },
    { id: "applications", label: "Заявки", icon: <UserPlus className="w-5 h-5" /> },
    { id: "analytics", label: "Аналитика", icon: <BarChart3 className="w-5 h-5" /> },
    { id: "progress", label: "Прогресс", icon: <TrendingUp className="w-5 h-5" /> },
    { id: "gradebook", label: "Журнал", icon: <ClipboardCheck className="w-5 h-5" /> },
    { id: "live", label: "Live", icon: <Video className="w-5 h-5" /> },
    { id: "homework", label: "Д/З", icon: <FileText className="w-5 h-5" /> },
    { id: "schedule", label: "Расписание", icon: <Calendar className="w-5 h-5" /> },
    { id: "info", label: "Информация", icon: <Info className="w-5 h-5" /> },
  ];

  const handleTabChange = (tab: TeacherTabId) => {
    onChangeTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800" data-onboarding="teacher-dashboard">
      {/* <OnboardingTooltip /> */} {/* Временно отключено - блокирует экран */}

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="bg-white rounded-xl px-6 py-4 shadow-xl flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-700 font-medium">Обработка...</span>
          </div>
        </div>
      )}

      {/* Help button - z-20 чтобы не перекрывал меню */}
      <button
        onClick={handleRestartOnboarding}
        className="fixed top-20 right-4 z-20 bg-emerald-600 text-white rounded-xl shadow-lg p-3 hover:bg-emerald-700 transition-colors"
        aria-label="Помощь"
        title="Показать обучение"
      >
        <Info className="w-5 h-5" />
      </button>

      {/* Mobile menu button - z-40 чтобы был выше help button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-20 left-4 z-40 bg-white rounded-xl shadow-lg p-3 border border-slate-200 hover:bg-slate-50 transition-colors"
        aria-label="Открыть меню"
      >
        {mobileMenuOpen ? (
          <X className="w-6 h-6 text-slate-700" />
        ) : (
          <Menu className="w-6 h-6 text-slate-700" />
        )}
      </button>

      {/* Mobile menu overlay - z-30 чтобы был под меню но над help button */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <main className="w-full px-2 py-2 sm:px-4 sm:py-4 lg:px-8 lg:py-6 grid grid-cols-1 lg:grid-cols-4 gap-3 lg:gap-6">
        {/* Sidebar - на мобильных это модальное меню */}
        <nav
          className={`lg:col-span-1 bg-white lg:rounded-2xl lg:shadow-sm lg:border lg:border-slate-200 p-4 lg:p-6 space-y-2 h-fit transition-transform lg:translate-x-0 relative ${
            mobileMenuOpen
              ? "fixed inset-4 top-32 z-40 max-h-[calc(100vh-9rem)] overflow-y-auto rounded-2xl shadow-xl border border-slate-200"
              : "hidden lg:block"
          }`}
        >
          {/* Кнопка закрытия для мобильного меню */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden absolute top-3 right-3 p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Закрыть меню"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              data-onboarding={`tab-${t.id}`}
              className={`w-full text-left p-4 rounded-xl transition-all font-semibold text-sm flex items-center gap-3 ${
                activeTab === t.id
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-slate-700 hover:bg-slate-100 border border-transparent"
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
          <div className="pt-4 border-t border-slate-200 mt-4">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full text-left p-4 rounded-xl transition-all font-semibold text-sm text-red-600 hover:bg-red-50 border border-transparent flex items-center gap-3"
            >
              <LogOut className="w-5 h-5" />
              <span>Выйти</span>
            </button>
          </div>
        </nav>

        <section className="lg:col-span-3 bg-white lg:rounded-2xl lg:shadow-sm lg:border lg:border-slate-200 min-h-[650px] overflow-hidden flex flex-col -mx-2 sm:-mx-4 lg:mx-0">
          <div className="p-4 lg:p-6 border-b border-slate-200">{header}</div>
          <div className="flex-1">{children}</div>
        </section>
      </main>
    </div>
  );
}

