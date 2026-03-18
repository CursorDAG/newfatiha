"use client";

import React from "react";
import { Button } from "@/components/teacher/ui/Button";
import EmptyState from "@/components/teacher/ui/EmptyState";

type Course = { id: string; title: string };
type Stream = {
  id: string;
  name: string;
  level: string;
  schedule: string;
  courseId?: string;
  color?: string;
  inviteToken?: { token: string } | null;
};

export default function TeacherStreamsTab({
  courses,
  streams,
  selectedCourseId,
  onChangeCourse,
  onCreate,
  onCreateForCourse,
  onEdit,
  onDelete,
  onCopyInvite,
  onRevokeInvite,
}: {
  courses: Course[];
  streams: Stream[];
  selectedCourseId: string;
  onChangeCourse: (courseId: string) => void;
  onCreate: () => void;
  onCreateForCourse: (courseId: string) => void;
  onEdit: (stream: Stream) => void;
  onDelete: (streamId: string) => void;
  onCopyInvite?: (streamId: string) => void;
  onRevokeInvite?: (streamId: string) => void;
}) {
  return (
    <div className="p-8 flex-1">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold text-emerald-900">Потоки</h2>
          <p className="text-sm text-slate-500 mt-1">Группы учеников внутри курсов</p>
        </div>
        <Button onClick={onCreate} disabled={courses.length === 0} variant="primary">
          + Создать поток
        </Button>
      </div>

      {courses.length === 0 ? (
        <EmptyState icon="📚" title="Сначала создайте курс" description="Потоки создаются внутри курсов." />
      ) : (
        <div className="space-y-8">
          {courses.map((course) => {
            const courseStreams = streams.filter((s) => s.courseId === course.id);
            return (
              <div key={course.id}>
                {/* Course heading */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Курс</span>
                    <h3 className="text-base font-bold text-slate-800">{course.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCreateForCourse(course.id)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                  >
                    + Добавить поток
                  </button>
                </div>

                {courseStreams.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-2xl p-5 text-center text-slate-400 text-sm">
                    Нет потоков в этом курсе
                  </div>
                ) : (
                  <div className="space-y-3">
                    {courseStreams.map((s) => (
                      <div
                        key={s.id}
                        className="border border-slate-200 rounded-2xl p-4 bg-white flex flex-col gap-4 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="min-w-0 flex items-start gap-3">
                            {/* Colour stripe */}
                            <span
                              className="mt-1 shrink-0 inline-block w-3 h-3 rounded-full border border-slate-200"
                              style={{ backgroundColor: s.color ?? "#10b981" }}
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 truncate">{s.name}</p>
                              <p className="text-sm text-slate-500 mt-0.5">
                                <span className="font-semibold text-slate-600">{s.level}</span>
                                {s.schedule ? ` · ${s.schedule}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button onClick={() => onEdit(s)} variant="secondary" size="sm">
                              Редактировать
                            </Button>
                            <Button onClick={() => onDelete(s.id)} variant="danger" size="sm">
                              Удалить
                            </Button>
                          </div>
                        </div>

                        {/* Invite link management block */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-3 border-t border-slate-100">
                          <span className="text-xs font-bold text-slate-500 shrink-0">Приглашение:</span>
                          {s.inviteToken ? (
                            <div className="flex flex-wrap gap-2 items-center">
                              <code className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono max-w-[260px] truncate block">
                                fatiha.ru/join/{s.inviteToken.token}
                              </code>
                              <button
                                onClick={() => onCopyInvite?.(s.id)}
                                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-3 py-1 transition-all"
                              >
                                📋 Скопировать
                              </button>
                              <button
                                onClick={() => onRevokeInvite?.(s.id)}
                                className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg px-3 py-1 transition-all"
                              >
                                🚫 Отозвать
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => onCopyInvite?.(s.id)}
                              className="text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-1 transition-all"
                            >
                              🔗 Сгенерировать ссылку
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
