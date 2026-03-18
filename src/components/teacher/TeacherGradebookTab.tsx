"use client";

import React from "react";
import EmptyState from "@/components/teacher/ui/EmptyState";
import { Button } from "@/components/teacher/ui/Button";

export type GradebookLesson = {
  id: string;
  title: string;
  hasHomework: boolean;
  hasQuiz: boolean;
};

export type GradebookHomeworkStatus =
  | "SUBMITTED"
  | "ACCEPTED"
  | "NEEDS_REWORK"
  | "REJECTED"
  | "NOT_ASSIGNED"
  | "NO_SUBMISSION"
  | null;

export type GradebookQuizStatus = "SUBMITTED" | "PASSED" | "FAILED" | "NO_SUBMISSION" | null;

export type GradebookCell = {
  lessonId: string;
  homeworkStatus: GradebookHomeworkStatus;
  quizStatus: GradebookQuizStatus;
};

export type GradebookStudentRow = {
  enrollmentId: string;
  studentId: string;
  name: string;
  cells: GradebookCell[];
};

export type GradebookPayload = {
  stream: { id: string; name: string; courseTitle: string };
  lessons: GradebookLesson[];
  students: GradebookStudentRow[];
};

function statusBadgeColorForHomework(status: GradebookHomeworkStatus) {
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

function labelForHomework(status: GradebookHomeworkStatus) {
  switch (status) {
    case "ACCEPTED":
      return "Д/З: принято";
    case "NEEDS_REWORK":
      return "Д/З: доработать";
    case "REJECTED":
      return "Д/З: отклонено";
    case "SUBMITTED":
      return "Д/З: на проверке";
    case "NOT_ASSIGNED":
      return "Д/З: нет";
    case "NO_SUBMISSION":
      return "Д/З: не сдано";
    default:
      return "Д/З: —";
  }
}

function statusBadgeColorForQuiz(status: GradebookQuizStatus) {
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

function labelForQuiz(status: GradebookQuizStatus) {
  switch (status) {
    case "PASSED":
      return "Тест: пройден";
    case "FAILED":
      return "Тест: не пройден";
    case "SUBMITTED":
      return "Тест: на проверке";
    case "NO_SUBMISSION":
      return "Тест: не сдан";
    default:
      return "Тест: —";
  }
}

export default function TeacherGradebookTab({
  hasStream,
  loading,
  error,
  data,
  onRefresh,
  onOpenStudent,
}: {
  hasStream: boolean;
  loading: boolean;
  error: string;
  data: GradebookPayload | null;
  onRefresh: () => void;
  onOpenStudent: (enrollmentId: string) => void;
}) {
  if (!hasStream) {
    return (
      <div className="p-8 flex-1">
        <EmptyState
          icon="📚"
          title="Выберите поток"
          description="Выберите поток слева вверху, чтобы увидеть журнал."
        />
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="p-8 flex-1">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
          Загрузка журнала...
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 flex-1">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-4">
          <p className="text-red-700 font-semibold">Не удалось загрузить журнал</p>
          <p className="text-sm text-red-600">{error}</p>
          <Button size="sm" variant="secondary" onClick={onRefresh}>
            Попробовать ещё раз
          </Button>
        </div>
      </div>
    );
  }

  if (!data || data.students.length === 0 || data.lessons.length === 0) {
    return (
      <div className="p-8 flex-1">
        <EmptyState
          icon="📓"
          title="Журнал пока пуст"
          description="Нужны хотя бы один урок и один ученик в потоке, чтобы построить журнал."
        />
      </div>
    );
  }

  return (
    <div className="p-8 flex-1 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-emerald-900">Журнал</h2>
          <p className="text-sm text-slate-500 mt-1">
            Поток {data.stream.name} • курс {data.stream.courseTitle}
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={onRefresh}>
          Обновить
        </Button>
      </div>

      <div className="relative border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="sticky left-0 z-10 bg-slate-100 px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Ученик
                </th>
                {data.lessons.map((lesson) => (
                  <th
                    key={lesson.id}
                    className="px-3 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide min-w-[140px]"
                  >
                    <div className="truncate" title={lesson.title}>
                      {lesson.title}
                    </div>
                    <div className="mt-1 text-[10px] text-slate-400 font-semibold">
                      {lesson.hasHomework ? "Д/З" : ""} {lesson.hasQuiz ? "• Тест" : ""}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.students.map((student) => (
                <tr key={student.enrollmentId} className="border-b border-slate-100 hover:bg-white/60">
                  <td className="sticky left-0 z-10 bg-slate-50/90 backdrop-blur px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onOpenStudent(student.enrollmentId)}
                      className="flex items-center gap-3 text-left w-full"
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm border border-emerald-200">
                        {student.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{student.name}</p>
                        <p className="text-[11px] text-emerald-700 font-semibold">Профиль</p>
                      </div>
                    </button>
                  </td>
                  {student.cells.map((cell) => (
                    <td key={cell.lessonId} className="px-3 py-3 align-top">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${statusBadgeColorForHomework(
                            cell.homeworkStatus,
                          )}`}
                        >
                          {labelForHomework(cell.homeworkStatus)}
                        </span>
                        <span
                          className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${statusBadgeColorForQuiz(
                            cell.quizStatus,
                          )}`}
                        >
                          {labelForQuiz(cell.quizStatus)}
                        </span>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

