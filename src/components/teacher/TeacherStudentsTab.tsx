"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Users, UserPlus, ArrowRightLeft, RotateCcw, UserX } from "lucide-react";

type Enrollment = { id: string; userId: string; status: string; name: string };
type Stream = { id: string; name: string; enrollments: Enrollment[] };

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "error" | "info" | "neutral" }> = {
  ACTIVE: { label: "Активен", variant: "success" },
  TRANSFERRED: { label: "Переведён", variant: "info" },
  KICKED: { label: "Исключён", variant: "error" },
  REPEATING: { label: "Повторяет", variant: "warning" },
};

export default function TeacherStudentsTab({
  stream,
  onInvite,
  onTransfer,
  onRepeat,
  onKick,
}: {
  stream: Stream | null | undefined;
  onInvite?: () => void;
  onTransfer: (enrollment: Enrollment) => void;
  onRepeat: (enrollment: Enrollment) => void;
  onKick: (enrollment: Enrollment) => void;
}) {
  if (!stream) {
    return (
      <div className="p-8 flex-1">
        <Card padding="p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">У вас нет потоков</h3>
            <p className="text-slate-600">Создайте поток, чтобы добавить студентов</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 flex-1">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Студенты потока</h2>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="info" size="lg">{stream.name}</Badge>
            <span className="text-sm text-slate-600">
              {stream.enrollments.length} {stream.enrollments.length === 1 ? 'студент' : 'студентов'}
            </span>
          </div>
        </div>
        {onInvite && (
          <Button onClick={onInvite} variant="primary" size="lg" icon={<UserPlus className="w-5 h-5" />}>
            Пригласить
          </Button>
        )}
      </div>

      {stream.enrollments.length === 0 ? (
        <Card padding="p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">В этом потоке пока нет студентов</h3>
            <p className="text-slate-600 mb-6">Используйте кнопку «Пригласить», чтобы добавить первого</p>
            {onInvite && (
              <Button onClick={onInvite} variant="primary" icon={<UserPlus className="w-5 h-5" />}>
                Пригласить студента
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card padding="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-6 text-xs font-bold text-slate-700 uppercase tracking-wider">Студент</th>
                  <th className="p-6 text-xs font-bold text-slate-700 uppercase tracking-wider">Статус</th>
                  <th className="p-6 text-xs font-bold text-slate-700 uppercase tracking-wider text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stream.enrollments.map((enrollment, idx) => {
                  const config = statusConfig[enrollment.status] || { label: enrollment.status, variant: "neutral" as const };
                  return (
                    <tr key={enrollment.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                            {enrollment.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{enrollment.name}</p>
                            <p className="text-xs text-slate-500">Студент #{idx + 1}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <Badge variant={config.variant} size="md">{config.label}</Badge>
                      </td>
                      <td className="p-6">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onTransfer(enrollment)}
                            icon={<ArrowRightLeft className="w-4 h-4" />}
                          >
                            Перевести
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onRepeat(enrollment)}
                            icon={<RotateCcw className="w-4 h-4" />}
                          >
                            Повтор
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => onKick(enrollment)}
                            icon={<UserX className="w-4 h-4" />}
                          >
                            Исключить
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

