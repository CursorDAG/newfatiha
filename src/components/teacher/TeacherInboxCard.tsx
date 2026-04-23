"use client";

import { useEffect, useState, useCallback } from "react";
import { UserPlus, FileText, FlaskConical, ChevronRight } from "lucide-react";

type Application = {
  id: string;
  studentName: string;
  streamId: string;
  streamName: string;
  courseTitle: string;
  createdAt: string;
};
type HomeworkItem = {
  id: string;
  assignmentTitle: string;
  type: "TEXT" | "AUDIO";
  studentName: string;
  streamId: string;
  streamName: string;
  submittedAt: string;
  status: "SUBMITTED" | "NEEDS_REWORK";
};
type QuizItem = {
  id: string;
  quizTitle: string;
  type: "MULTIPLE_CHOICE" | "VOICE";
  lessonTitle: string;
  streamId: string;
  streamName: string;
  studentName: string;
  submittedAt: string;
};

type InboxData = {
  applications: Application[];
  homework: HomeworkItem[];
  quizzes: QuizItem[];
};

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} д назад`;
  return new Date(iso).toLocaleDateString("ru-RU");
}

export default function TeacherInboxCard({
  onOpenApplications,
  onOpenHomework,
  onSelectStream,
}: {
  onOpenApplications: () => void;
  onOpenHomework: () => void;
  onSelectStream: (streamId: string) => void;
}) {
  const [data, setData] = useState<InboxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/inbox");
      if (!res.ok) throw new Error("Не удалось загрузить инбокс");
      const json = (await res.json()) as InboxData;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading && !data) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-400">
        Загрузка инбокса...
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        {error}
      </div>
    );
  }
  if (!data) return null;

  const total = data.applications.length + data.homework.length + data.quizzes.length;

  if (total === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-bold text-emerald-800">Инбокс пуст</p>
        <p className="text-xs text-emerald-700 mt-1">
          Нет новых заявок и работ, ожидающих проверки.
        </p>
      </div>
    );
  }

  const Row = ({
    icon,
    title,
    subtitle,
    time,
    onClick,
    accent,
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    time: string;
    onClick: () => void;
    accent: "amber" | "sky" | "violet";
  }) => {
    const accentBg = {
      amber: "bg-amber-50 border-amber-200",
      sky: "bg-sky-50 border-sky-200",
      violet: "bg-violet-50 border-violet-200",
    }[accent];
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full flex items-center gap-3 border rounded-xl p-3 text-left hover:shadow-sm transition-all ${accentBg}`}
      >
        <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 truncate">{title}</p>
          <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>
        </div>
        <div className="shrink-0 text-xs text-slate-400">{time}</div>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Инбокс · требует внимания · {total}
        </h3>
        <button
          type="button"
          onClick={load}
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
        >
          Обновить
        </button>
      </div>

      {data.applications.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Заявки · {data.applications.length}
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenApplications}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              Все
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {data.applications.slice(0, 5).map((a) => (
              <Row
                key={a.id}
                icon={<UserPlus className="w-4 h-4 text-amber-600" />}
                title={a.studentName}
                subtitle={`${a.courseTitle} · ${a.streamName}`}
                time={formatRelative(a.createdAt)}
                onClick={onOpenApplications}
                accent="amber"
              />
            ))}
          </div>
        </section>
      )}

      {data.homework.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
                Домашки на проверку · {data.homework.length}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            {data.homework.slice(0, 5).map((h) => (
              <Row
                key={h.id}
                icon={<FileText className="w-4 h-4 text-sky-600" />}
                title={h.assignmentTitle}
                subtitle={`${h.studentName} · ${h.streamName}${h.type === "AUDIO" ? " · аудио" : ""}`}
                time={formatRelative(h.submittedAt)}
                onClick={() => {
                  onSelectStream(h.streamId);
                  onOpenHomework();
                }}
                accent="sky"
              />
            ))}
          </div>
        </section>
      )}

      {data.quizzes.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-violet-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-violet-700">
                Тесты на проверку · {data.quizzes.length}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            {data.quizzes.slice(0, 5).map((q) => (
              <Row
                key={q.id}
                icon={<FlaskConical className="w-4 h-4 text-violet-600" />}
                title={q.quizTitle}
                subtitle={`${q.studentName} · ${q.lessonTitle}${q.type === "VOICE" ? " · голос" : ""}`}
                time={formatRelative(q.submittedAt)}
                onClick={() => onSelectStream(q.streamId)}
                accent="violet"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
