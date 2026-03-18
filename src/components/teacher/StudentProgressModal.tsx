"use client";

import React from "react";
import ModalShell from "@/components/teacher/ui/ModalShell";
import { Button } from "@/components/teacher/ui/Button";
import type {
  StudentProgressPayload,
  StudentLessonProgress,
} from "@/app/api/teacher/students/[enrollmentId]/progress/route";

// ── Homework badge helpers ──────────────────────────────────────────────────

function homeworkBadgeClass(
  status: StudentLessonProgress["homeworkStatus"],
): string {
  switch (status) {
    case "ACCEPTED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "NEEDS_REWORK":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "REJECTED":
      return "bg-red-50 text-red-700 border-red-200";
    case "SUBMITTED":
      return "bg-slate-50 text-slate-700 border-slate-200";
    case "NOT_ASSIGNED":
      return "bg-slate-50 text-slate-400 border-slate-200";
    case "NO_SUBMISSION":
      return "bg-slate-50 text-slate-500 border-slate-200";
    default:
      return "bg-slate-50 text-slate-500 border-slate-200";
  }
}

function homeworkLabel(status: StudentLessonProgress["homeworkStatus"]): string {
  switch (status) {
    case "ACCEPTED":
      return "Принято";
    case "NEEDS_REWORK":
      return "Доработать";
    case "REJECTED":
      return "Отклонено";
    case "SUBMITTED":
      return "На проверке";
    case "NOT_ASSIGNED":
      return "Не задано";
    case "NO_SUBMISSION":
      return "Не сдано";
    default:
      return "—";
  }
}

// ── Quiz badge helpers ──────────────────────────────────────────────────────

function quizBadgeClass(status: StudentLessonProgress["quizStatus"]): string {
  switch (status) {
    case "PASSED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "FAILED":
      return "bg-red-50 text-red-700 border-red-200";
    case "SUBMITTED":
      return "bg-slate-50 text-slate-700 border-slate-200";
    case "NO_SUBMISSION":
      return "bg-slate-50 text-slate-500 border-slate-200";
    default:
      return "bg-slate-50 text-slate-500 border-slate-200";
  }
}

function quizLabel(status: StudentLessonProgress["quizStatus"]): string {
  switch (status) {
    case "PASSED":
      return "Пройден";
    case "FAILED":
      return "Не пройден";
    case "SUBMITTED":
      return "На проверке";
    case "NO_SUBMISSION":
      return "Не сдан";
    default:
      return "—";
  }
}

// ── Date format helper ──────────────────────────────────────────────────────

function fmtDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

// ── Badge component ─────────────────────────────────────────────────────────

function Badge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${className}`}
    >
      {label}
    </span>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

/**
 * Displays a student's full lesson-by-lesson progress inside a modal.
 * Opened from TeacherGradebookTab when teacher clicks a student row.
 */
export default function StudentProgressModal({
  data,
  onClose,
}: {
  data: StudentProgressPayload;
  onClose: () => void;
}) {
  return (
    <ModalShell
      title={data.studentName}
      subtitle={`Поток: ${data.streamName}`}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Закрыть
        </Button>
      }
    >
      {data.lessons.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">
          В этом потоке ещё нет уроков.
        </p>
      ) : (
        <div className="overflow-y-auto max-h-[60vh] -mx-6 px-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wide">
                <th className="py-2 text-left w-6">#</th>
                <th className="py-2 text-left">Урок</th>
                <th className="py-2 text-center">Д/З</th>
                <th className="py-2 text-center">Тест</th>
              </tr>
            </thead>
            <tbody>
              {data.lessons.map((lesson, idx) => (
                <tr
                  key={lesson.lessonId}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                >
                  <td className="py-3 text-slate-400 font-semibold text-xs">
                    {idx + 1}
                  </td>
                  <td className="py-3 pr-4">
                    <p className="font-semibold text-slate-800 leading-snug">
                      {lesson.lessonTitle}
                    </p>
                  </td>
                  <td className="py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Badge
                        label={homeworkLabel(lesson.homeworkStatus)}
                        className={homeworkBadgeClass(lesson.homeworkStatus)}
                      />
                      {lesson.homeworkSubmittedAt && (
                        <span className="text-[10px] text-slate-400">
                          {fmtDate(lesson.homeworkSubmittedAt)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Badge
                        label={quizLabel(lesson.quizStatus)}
                        className={quizBadgeClass(lesson.quizStatus)}
                      />
                      {lesson.quizLastSubmittedAt && (
                        <span className="text-[10px] text-slate-400">
                          {fmtDate(lesson.quizLastSubmittedAt)}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ModalShell>
  );
}
