"use client";

import React, { useEffect } from "react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { teacherSteps } from "@/components/onboarding/teacherSteps";
import { Info } from "lucide-react";

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

/**
 * TeacherShell — обёртка контента дашборда учителя.
 * Навигация-вкладки вынесена во внешний RoleSidebar (?tab=),
 * поэтому здесь только карточка с заголовком и содержимым.
 */
export default function TeacherShell({
  header,
  children,
  loading,
}: {
  activeTab?: TeacherTabId;
  onChangeTab?: (tab: TeacherTabId) => void;
  header: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
}) {
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

  return (
    <div className="text-slate-800" data-onboarding="teacher-dashboard">
      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="glass-card rounded-xl px-6 py-4 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            <span className="text-cream font-medium">Обработка...</span>
          </div>
        </div>
      )}

      {/* Help button */}
      <button
        onClick={handleRestartOnboarding}
        className="fixed bottom-24 md:bottom-6 right-4 z-30 bg-[#D4AF37] text-[#06201A] rounded-xl shadow-lg p-3 hover:bg-[#E8D48B] transition-colors"
        aria-label="Помощь"
        title="Показать обучение"
      >
        <Info className="w-5 h-5" />
      </button>

      <section className="glass-card rounded-2xl min-h-[650px] overflow-hidden flex flex-col">
        <div className="p-4 lg:p-6 border-b border-white/10">{header}</div>
        <div className="flex-1">{children}</div>
      </section>
    </div>
  );
}
