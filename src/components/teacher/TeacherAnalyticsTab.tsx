"use client";

import React from "react";
import { Button } from "@/components/teacher/ui/Button";
import EmptyState from "@/components/teacher/ui/EmptyState";

type AnalyticsSubmission = {
  id: string;
  createdAt: string;
  status: "SUBMITTED" | "PASSED" | "FAILED";
  quizTitle: string;
  quizType?: "MULTIPLE_CHOICE" | "VOICE";
  lessonTitle: string;
  hasVoice?: boolean;
  checkedAt: string | null;
  checkedByName: string | null;
};

type AnalyticsStudentRow = {
  enrollmentId: string;
  studentId: string;
  name: string;
  status: string;
  lastLoginAt: string | null;
  timeSpentMinutes: number;
  liveMinutes: number;
  lessonMinutes: number;
  submissions: {
    submittedCount: number;
    passedCount: number;
    failedCount: number;
    pendingCount: number;
  };
  recentSubmissions: AnalyticsSubmission[];
};

type AnalyticsPayload = {
  stream: { id: string; name: string; courseTitle: string };
  retentionDays: number;
  students: AnalyticsStudentRow[];
};

export default function TeacherAnalyticsTab({
  hasStream,
  loading,
  error,
  data,
  onRefresh,
  onCopyTsv,
  onPlayVoice,
  onCheckSubmission,
}: {
  hasStream: boolean;
  loading: boolean;
  error: string;
  data: AnalyticsPayload | null;
  onRefresh: () => void;
  onCopyTsv: () => void;
  onPlayVoice: (submissionId: string) => void;
  onCheckSubmission: (submissionId: string, status: "PASSED" | "FAILED") => void;
}) {
  if (!hasStream) {
    return <EmptyState icon="📈" title="Выберите поток" description="Статистика строится по выбранному потоку." />;
  }

  return (
    <div className="p-8 flex-1">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-emerald-900">Успеваемость и активность (30 дней)</h2>
        <div className="flex gap-2">
          <Button onClick={onCopyTsv} variant="primary">
            Скопировать в Google Sheets
          </Button>
          <Button onClick={onRefresh} variant="secondary">
            Обновить
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center text-slate-500 font-semibold">
          Загрузка статистики...
        </div>
      )}

      {!loading && data?.students && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Посещаемость LIVE</p>
              <p className="text-3xl font-extrabold text-slate-800 mt-2">
                {Math.round(
                  (data.students.reduce((acc: number, s) => acc + (s.liveMinutes ?? 0), 0) /
                    Math.max(1, data.students.length)) || 0
                )}{" "}
                <span className="text-sm font-bold text-slate-500">мин/ученик</span>
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Время в кабинете</p>
              <p className="text-3xl font-extrabold text-slate-800 mt-2">
                {Math.round(
                  (data.students.reduce((acc: number, s) => acc + (s.timeSpentMinutes ?? 0), 0) /
                    Math.max(1, data.students.length)) || 0
                )}{" "}
                <span className="text-sm font-bold text-slate-500">мин/ученик</span>
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Тесты на проверке</p>
              <p className="text-3xl font-extrabold text-slate-800 mt-2">
                {data.students.reduce((acc: number, s) => acc + (s.submissions?.pendingCount ?? 0), 0)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-bold tracking-wider">
                <tr>
                  <th className="p-4 py-3">Ученик</th>
                  <th className="p-4 py-3 min-w-[160px]">Последний вход</th>
                  <th className="p-4 py-3 min-w-[140px]">LIVE (мин)</th>
                  <th className="p-4 py-3 min-w-[140px]">Кабинет (мин)</th>
                  <th className="p-4 py-3 text-right">Тесты</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {(() => {
                  const maxLive = Math.max(...data.students.map((x) => x.liveMinutes ?? 0), 1);
                  const maxApp = Math.max(...data.students.map((x) => x.timeSpentMinutes ?? 0), 1);
                  return data.students.map((s) => {
                  const live = s.liveMinutes ?? 0;
                  const app = s.timeSpentMinutes ?? 0;
                  const pending = s.submissions?.pendingCount ?? 0;
                  const passed = s.submissions?.passedCount ?? 0;
                  const failed = s.submissions?.failedCount ?? 0;
                  return (
                    <tr key={s.studentId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 font-semibold text-slate-800">{s.name}</td>
                      <td className="p-4 text-sm text-slate-600">
                        {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString("ru-RU") : "—"}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-700 w-10">{live}</span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-500"
                              style={{ width: `${Math.min(100, (live / maxLive) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-700 w-10">{app}</span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500"
                              style={{ width: `${Math.min(100, (app / maxApp) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-full mr-2">
                          {pending} ждут
                        </span>
                        <span className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full mr-2">
                          {passed} прошёл
                        </span>
                        <span className="text-xs font-bold bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded-full">
                          {failed} не прошёл
                        </span>
                      </td>
                    </tr>
                  );
                  });
                })()}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-extrabold text-slate-800 mb-3">Последние сдачи</h3>
            <div className="grid gap-3">
              {data.students
                .flatMap((s) =>
                  (s.recentSubmissions ?? []).slice(0, 4).map((sub) => ({ studentName: s.name, ...sub }))
                )
                .slice(0, 12)
                .map((sub) => (
                  <div
                    key={sub.id}
                    className="border border-slate-200 rounded-2xl p-4 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-slate-800 truncate">
                        {sub.studentName} • {sub.lessonTitle}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(sub.createdAt).toLocaleString("ru-RU")} • {sub.quizTitle}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                          sub.status === "PASSED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : sub.status === "FAILED"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {sub.status === "PASSED"
                          ? "Пройден"
                          : sub.status === "FAILED"
                            ? "Не пройден"
                            : "На проверке"}
                      </span>
                      {sub.hasVoice && (
                        <Button variant="secondary" size="sm" onClick={() => onPlayVoice(sub.id)}>
                          Голос
                        </Button>
                      )}
                      <Button variant="primary" size="sm" onClick={() => onCheckSubmission(sub.id, "PASSED")}>
                        Прошёл
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => onCheckSubmission(sub.id, "FAILED")}>
                        Не прошёл
                      </Button>
                    </div>
                  </div>
                ))}

              {data.students.every((s) => (s.recentSubmissions ?? []).length === 0) && (
                <EmptyState
                  icon="🧪"
                  title="Пока нет сдач тестов"
                  description="Создайте тест по уроку и попросите учеников пройти его."
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

