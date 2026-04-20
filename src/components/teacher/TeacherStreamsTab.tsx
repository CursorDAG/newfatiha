"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Plus, Copy, XCircle, Users as UsersIcon } from "lucide-react";

type Course = { id: string; title: string };
type Stream = {
  id: string;
  name: string;
  level: string;
  schedule: string;
  courseId?: string;
  color?: string;
  genderType?: "MALE_ONLY" | "FEMALE_ONLY" | "MIXED";
  inviteToken?: { token: string } | null;
};

export default function TeacherStreamsTab({
  courses,
  streams,
  onCreate,
  onCreateForCourse,
  onEdit,
  onDelete,
  onCopyInvite,
  onRevokeInvite,
}: {
  courses: Course[];
  streams: Stream[];
  onCreate: () => void;
  onCreateForCourse: (courseId: string) => void;
  onEdit: (stream: Stream) => void;
  onDelete: (streamId: string) => void;
  onCopyInvite?: (streamId: string) => void;
  onRevokeInvite?: (streamId: string) => void;
}) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 flex-1">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold text-slate-900">Потоки</h2>
          <p className="text-sm text-slate-600 mt-2">Группы учеников внутри курсов</p>
        </div>
        <Button
          onClick={onCreate}
          disabled={courses.length === 0}
          variant="primary"
          size="lg"
          icon={<Plus className="w-5 h-5" />}
        >
          Создать поток
        </Button>
      </div>

      {courses.length === 0 ? (
        <Card padding="p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UsersIcon className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Сначала создайте курс</h3>
            <p className="text-slate-600">Потоки создаются внутри курсов</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {courses.map((course) => {
            const courseStreams = streams.filter((s) => s.courseId === course.id);
            return (
              <div key={course.id}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="neutral" size="sm">КУРС</Badge>
                    <h3 className="text-lg font-bold text-slate-900">{course.title}</h3>
                  </div>
                  <Button
                    onClick={() => onCreateForCourse(course.id)}
                    variant="ghost"
                    size="sm"
                    icon={<Plus className="w-4 h-4" />}
                  >
                    Добавить поток
                  </Button>
                </div>

                {courseStreams.length === 0 ? (
                  <Card padding="p-8">
                    <p className="text-center text-slate-500">Нет потоков в этом курсе</p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {courseStreams.map((s) => (
                      <Card key={s.id} hoverable padding="p-6">
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div className="flex items-start gap-4 min-w-0 flex-1">
                              <span
                                className="mt-1 shrink-0 w-4 h-4 rounded-full border-2 border-white shadow-sm"
                                style={{ backgroundColor: s.color ?? "#10b981" }}
                              />
                              <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-base text-slate-900 mb-1">{s.name}</h4>
                                <p className="text-sm text-slate-600 mb-2">
                                  <span className="font-semibold">{s.level}</span>
                                  {s.schedule && <span className="text-slate-500"> · {s.schedule}</span>}
                                </p>
                                {s.genderType && s.genderType !== "MIXED" && (
                                  <Badge
                                    variant={s.genderType === "MALE_ONLY" ? "info" : "warning"}
                                    size="sm"
                                  >
                                    {s.genderType === "MALE_ONLY" ? "♂ Только мужчины" : "♀ Только женщины"}
                                  </Badge>
                                )}
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

                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-4 border-t border-slate-200">
                            <span className="text-sm font-bold text-slate-700 shrink-0">Приглашение:</span>
                            {s.inviteToken ? (
                              <div className="flex flex-wrap gap-2 items-center flex-1">
                                <code className="text-xs text-slate-700 bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 font-mono flex-1 min-w-0 truncate">
                                  fatiha.ru/join/{s.inviteToken.token}
                                </code>
                                <Button
                                  onClick={() => onCopyInvite?.(s.id)}
                                  variant="success"
                                  size="sm"
                                  icon={<Copy className="w-4 h-4" />}
                                >
                                  Скопировать
                                </Button>
                                <Button
                                  onClick={() => onRevokeInvite?.(s.id)}
                                  variant="danger"
                                  size="sm"
                                  icon={<XCircle className="w-4 h-4" />}
                                >
                                  Отозвать
                                </Button>
                              </div>
                            ) : (
                              <Button
                                onClick={() => onCopyInvite?.(s.id)}
                                variant="secondary"
                                size="sm"
                                icon={<Plus className="w-4 h-4" />}
                              >
                                Сгенерировать ссылку
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
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
