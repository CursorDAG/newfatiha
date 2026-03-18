"use client";

import React from "react";
import { Button } from "@/components/teacher/ui/Button";
import EmptyState from "@/components/teacher/ui/EmptyState";
import StatusBadge from "@/components/teacher/ui/StatusBadge";

type Enrollment = { id: string; userId: string; status: string; name: string };
type Stream = { id: string; name: string; enrollments: Enrollment[] };

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
    return <EmptyState icon="📚" title="У вас нет потоков" description="Создайте поток, чтобы добавить студентов." />;
  }

  return (
    <div className="p-8 flex-1">
      <h2 className="text-2xl font-bold mb-6 text-emerald-900 border-b pb-4 flex flex-wrap justify-between items-center gap-3">
        Студенты потока
        <div className="flex items-center gap-2">
          {onInvite && (
            <Button onClick={onInvite} variant="secondary" size="sm">
              + Пригласить
            </Button>
          )}
          <span className="text-base font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            {stream.name}
          </span>
        </div>
      </h2>

      <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-bold tracking-wider">
            <tr>
              <th className="p-4 py-3">Студент</th>
              <th className="p-4 py-3 min-w-[130px]">Статус</th>
              <th className="p-4 py-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {stream.enrollments.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-10 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">🎓</span>
                    <p>В этом потоке пока нет студентов.</p>
                    <p className="text-xs">Используйте кнопку «Пригласить», чтобы добавить первого.</p>
                  </div>
                </td>
              </tr>
            ) : (
              stream.enrollments.map((enrollment, idx) => (
                <tr key={enrollment.id} className="hover:bg-slate-50/70 transition-colors group">
                  <td className="p-4 font-semibold text-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm border border-emerald-200 shrink-0">
                        {enrollment.name.charAt(0)}
                      </div>
                      <span>
                        {idx + 1}. {enrollment.name}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={enrollment.status} />
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button variant="secondary" size="sm" onClick={() => onTransfer(enrollment)}>
                        Перевести
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => onRepeat(enrollment)}>
                        Повтор
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => onKick(enrollment)}>
                        Исключить
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

