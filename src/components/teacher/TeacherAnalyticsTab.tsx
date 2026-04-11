"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BarChart3, Download, RefreshCw, Clock, Video, CheckCircle, XCircle, AlertCircle, Play } from "lucide-react";

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

export type AnalyticsPayload = {
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
    return (
      <div className="p-8 flex-1">
        <Card padding="p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Выберите поток</h3>
            <p className="text-slate-600">Статистика строится по выбранному потоку</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 flex-1">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Успеваемость и активность</h2>
          <p className="text-sm text-slate-600 mt-2">Статистика за последние 30 дней</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onCopyTsv} variant="primary" icon={<Download className="w-5 h-5" />}>
            Экспорт в Sheets
          </Button>
          <Button onClick={onRefresh} variant="secondary" icon={<RefreshCw className="w-5 h-5" />}>
            Обновить
          </Button>
        </div>
      </div>

      {error && (
        <Card padding="p-6" className="mb-6 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm font-semibold text-red-700">{error}</p>
          </div>
        </Card>
      )}

      {loading && (
        <Card padding="p-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600 font-semibold">Загрузка статистики...</p>
          </div>
        </Card>
      )}

      {!loading && data?.students && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card padding="p-6" hoverable>
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <Video className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <p className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Посещаемость LIVE</p>
              <p className="text-4xl font-extrabold text-slate-900">
                {Math.round(
                  (data.students.reduce((acc: number, s) => acc + (s.liveMinutes ?? 0), 0) /
                    Math.max(1, data.students.length)) || 0
                )}
              </p>
              <p className="text-sm text-slate-600 mt-1">минут на ученика</p>
            </Card>

            <Card padding="p-6" hoverable>
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
              <p className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Время в кабинете</p>
              <p className="text-4xl font-extrabold text-slate-900">
                {Math.round(
                  (data.students.reduce((acc: number, s) => acc + (s.timeSpentMinutes ?? 0), 0) /
                    Math.max(1, data.students.length)) || 0
                )}
              </p>
              <p className="text-sm text-slate-600 mt-1">минут на ученика</p>
            </Card>

            <Card padding="p-6" hoverable>
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <p className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Тесты на проверке</p>
              <p className="text-4xl font-extrabold text-slate-900">
                {data.students.reduce((acc: number, s) => acc + (s.submissions?.pendingCount ?? 0), 0)}
              </p>
              <p className="text-sm text-slate-600 mt-1">ожидают проверки</p>
            </Card>
          </div>

          <Card padding="p-0" className="mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-6 text-xs font-bold text-slate-700 uppercase tracking-wider">Ученик</th>
                    <th className="p-6 text-xs font-bold text-slate-700 uppercase tracking-wider min-w-[180px]">Последний вход</th>
                    <th className="p-6 text-xs font-bold text-slate-700 uppercase tracking-wider min-w-[160px]">LIVE (мин)</th>
                    <th className="p-6 text-xs font-bold text-slate-700 uppercase tracking-wider min-w-[160px]">Кабинет (мин)</th>
                    <th className="p-6 text-xs font-bold text-slate-700 uppercase tracking-wider text-right">Тесты</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
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
                        <tr key={s.studentId} className="hover:bg-slate-50 transition-colors">
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
                                {s.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-bold text-slate-900">{s.name}</span>
                            </div>
                          </td>
                          <td className="p-6 text-sm text-slate-600">
                            {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString("ru-RU") : "—"}
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-slate-900 w-12">{live}</span>
                              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full"
                                  style={{ width: `${Math.min(100, (live / maxLive) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-slate-900 w-12">{app}</span>
                              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
                                  style={{ width: `${Math.min(100, (app / maxApp) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-6 text-right">
                            <div className="flex gap-2 justify-end">
                              <Badge variant="warning" size="sm">{pending} ждут</Badge>
                              <Badge variant="success" size="sm">{passed} прошёл</Badge>
                              <Badge variant="error" size="sm">{failed} не прошёл</Badge>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </Card>

          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-6">Последние сдачи</h3>
            <div className="grid gap-4">
              {data.students
                .flatMap((s) =>
                  (s.recentSubmissions ?? []).slice(0, 4).map((sub) => ({ studentName: s.name, ...sub }))
                )
                .slice(0, 12)
                .map((sub) => (
                  <Card key={sub.id} padding="p-6" hoverable>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant={
                              sub.status === "PASSED"
                                ? "success"
                                : sub.status === "FAILED"
                                  ? "error"
                                  : "warning"
                            }
                            size="md"
                            icon={
                              sub.status === "PASSED" ? (
                                <CheckCircle className="w-3 h-3" />
                              ) : sub.status === "FAILED" ? (
                                <XCircle className="w-3 h-3" />
                              ) : (
                                <AlertCircle className="w-3 h-3" />
                              )
                            }
                          >
                            {sub.status === "PASSED"
                              ? "Пройден"
                              : sub.status === "FAILED"
                                ? "Не пройден"
                                : "На проверке"}
                          </Badge>
                        </div>
                        <p className="font-bold text-slate-900 mb-1">
                          {sub.studentName} • {sub.lessonTitle}
                        </p>
                        <p className="text-sm text-slate-600">
                          {new Date(sub.createdAt).toLocaleString("ru-RU")} • {sub.quizTitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {sub.hasVoice && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onPlayVoice(sub.id)}
                            icon={<Play className="w-4 h-4" />}
                          >
                            Голос
                          </Button>
                        )}
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => onCheckSubmission(sub.id, "PASSED")}
                          icon={<CheckCircle className="w-4 h-4" />}
                        >
                          Прошёл
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => onCheckSubmission(sub.id, "FAILED")}
                          icon={<XCircle className="w-4 h-4" />}
                        >
                          Не прошёл
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}

              {data.students.every((s) => (s.recentSubmissions ?? []).length === 0) && (
                <Card padding="p-12">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">Пока нет сдач тестов</h3>
                    <p className="text-slate-600">Создайте тест по уроку и попросите учеников пройти его</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

