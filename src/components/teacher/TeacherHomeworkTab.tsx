"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/teacher/ui/Button";
import EmptyState from "@/components/teacher/ui/EmptyState";
import ModalShell from "@/components/teacher/ui/ModalShell";

// ── Exported types (also used in TeacherDashboard) ──────────────────────────

export type HomeworkAssignmentSummary = {
  id: string;
  streamId: string;
  lesson: { id: string; title: string } | null;
  title: string;
  description?: string | null;
  type: "TEXT" | "AUDIO";
  dueAt: string | null;
  createdAt: string;
  submittedCount: number;
  acceptedCount: number;
  needsReworkCount: number;
  pendingCount: number;
};

export type HomeworkSubmissionSummary = {
  id: string;
  status: "SUBMITTED" | "ACCEPTED" | "NEEDS_REWORK" | "REJECTED";
  grade: number | null;
  teacherComment: string | null;
  contentText: string | null;
  contentUrl: string | null;
  submittedAt: string;
  checkedAt: string | null;
  student: {
    enrollmentId: string;
    userId: string;
    name: string;
  };
};

// ── Create Assignment Modal ──────────────────────────────────────────────────

type LessonOption = { id: string; title: string };

type CreateAssignmentData = {
  title: string;
  description: string;
  lessonId: string | null;
  type: "TEXT" | "AUDIO";
  dueAt: string | null;
};

function CreateAssignmentModal({
  lessons,
  onClose,
  onSubmit,
}: {
  lessons: LessonOption[];
  onClose: () => void;
  onSubmit: (data: CreateAssignmentData) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lessonId, setLessonId] = useState<string>("");
  const [type, setType] = useState<"TEXT" | "AUDIO">("TEXT");
  const [dueAt, setDueAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        lessonId: lessonId || null,
        type,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      title="Новое задание"
      subtitle="Создать домашнее задание для потока"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button
            variant="primary"
            disabled={!title.trim() || submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Создаю..." : "Создать"}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
        </div>
      }
    >
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1.5">
          Название <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Напишите задание..."
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none bg-slate-50 focus:bg-white"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1.5">Описание</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Дополнительные инструкции..."
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none bg-slate-50 focus:bg-white resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Тип</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "TEXT" | "AUDIO")}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none bg-slate-50 focus:bg-white"
          >
            <option value="TEXT">Текстовое</option>
            <option value="AUDIO">Аудио</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Дедлайн</label>
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none bg-slate-50 focus:bg-white"
          />
        </div>
      </div>

      {lessons.length > 0 && (
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">
            Привязать к уроку <span className="text-slate-400 font-normal">(необязательно)</span>
          </label>
          <select
            value={lessonId}
            onChange={(e) => setLessonId(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none bg-slate-50 focus:bg-white"
          >
            <option value="">— Без привязки —</option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        </div>
      )}
    </ModalShell>
  );
}

// ── Review Submission Panel ──────────────────────────────────────────────────

function SubmissionCard({
  submission,
  onCheck,
}: {
  submission: HomeworkSubmissionSummary;
  onCheck: (
    submissionId: string,
    status: "ACCEPTED" | "NEEDS_REWORK",
    teacherComment: string,
    grade: number | null,
  ) => void;
}) {
  const [comment, setComment] = useState(submission.teacherComment ?? "");
  const [grade, setGrade] = useState<string>(
    submission.grade !== null && submission.grade !== undefined
      ? String(submission.grade)
      : "",
  );

  const statusColor =
    submission.status === "ACCEPTED"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : submission.status === "NEEDS_REWORK"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : submission.status === "REJECTED"
          ? "bg-red-50 text-red-700 border-red-200"
          : "bg-slate-50 text-slate-600 border-slate-200";

  const statusLabel =
    submission.status === "ACCEPTED"
      ? "Принято"
      : submission.status === "NEEDS_REWORK"
        ? "Нужно доработать"
        : submission.status === "REJECTED"
          ? "Отклонено"
          : "На проверке";

  const parsedGrade = grade !== "" ? Number(grade) : null;

  return (
    <div className="p-4 border border-slate-200 rounded-2xl bg-white shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm border border-emerald-200 shrink-0">
            {submission.student.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 truncate">{submission.student.name}</p>
            <p className="text-[11px] text-slate-500">
              Сдано: {new Date(submission.submittedAt).toLocaleString("ru-RU")}
            </p>
          </div>
        </div>
        <span
          className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0 ${statusColor}`}
        >
          {statusLabel}
        </span>
      </div>

      {submission.contentText && (
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm text-slate-700 whitespace-pre-wrap">
          {submission.contentText}
        </div>
      )}
      {submission.contentUrl && (
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
          <audio controls className="w-full h-9">
            <source src={submission.contentUrl} />
          </audio>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">
            Комментарий учителя
          </label>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Оставьте комментарий..."
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none bg-slate-50 focus:bg-white resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">
            Оценка <span className="font-normal text-slate-400">(необязательно)</span>
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="0 – 100"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none bg-slate-50 focus:bg-white"
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onCheck(submission.id, "NEEDS_REWORK", comment, parsedGrade)}
        >
          Попросить доработать
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={() => onCheck(submission.id, "ACCEPTED", comment, parsedGrade)}
        >
          Принять
        </Button>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

/**
 * Homework assignments tab — props-driven.
 * The parent (TeacherDashboard) owns the assignment list and fetch logic.
 * Submission detail is fetched locally on-demand when the teacher selects an assignment.
 */
export default function TeacherHomeworkTab({
  streamId,
  loading,
  assignments,
  lessons,
  onRefresh,
  onCreateAssignment,
  onCheckSubmission,
}: {
  streamId: string | null;
  loading: boolean;
  assignments: HomeworkAssignmentSummary[];
  lessons: LessonOption[];
  onRefresh: () => void;
  onCreateAssignment: (data: CreateAssignmentData) => Promise<void>;
  onCheckSubmission: (
    submissionId: string,
    status: "ACCEPTED" | "NEEDS_REWORK",
    teacherComment: string,
    grade: number | null,
  ) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<HomeworkSubmissionSummary[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState("");

  useEffect(() => {
    if (!selectedAssignmentId) {
      setSubmissions([]);
      setSubError("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setSubLoading(true);
        setSubError("");
        const res = await fetch(`/api/teacher/homework/${selectedAssignmentId}/submissions`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Не удалось загрузить работы");
        if (!cancelled) setSubmissions(data.submissions ?? []);
      } catch (e) {
        if (!cancelled) setSubError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        if (!cancelled) setSubLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedAssignmentId]);

  // Reset selection when stream changes
  useEffect(() => {
    setSelectedAssignmentId(null);
    setSubmissions([]);
  }, [streamId]);

  const currentAssignment = assignments.find((a) => a.id === selectedAssignmentId) ?? null;

  return (
    <div className="p-8 flex-1 flex flex-col gap-6">
      {createOpen && (
        <CreateAssignmentModal
          lessons={lessons}
          onClose={() => setCreateOpen(false)}
          onSubmit={onCreateAssignment}
        />
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Assignment list ── */}
        <div className="lg:w-1/2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-emerald-900">Домашние задания</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={onRefresh}>
                Обновить
              </Button>
              {streamId && (
                <Button size="sm" variant="primary" onClick={() => setCreateOpen(true)}>
                  + Задание
                </Button>
              )}
            </div>
          </div>

          {!streamId ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
              Выберите поток, чтобы увидеть задания.
            </div>
          ) : loading ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
              Загрузка заданий...
            </div>
          ) : assignments.length === 0 ? (
            <EmptyState
              icon="📝"
              title="В этом потоке пока нет домашних заданий"
              description="Нажмите «+ Задание», чтобы создать первое."
              action={
                <Button size="sm" variant="primary" onClick={() => setCreateOpen(true)}>
                  + Задание
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {assignments.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAssignmentId(a.id)}
                  className={`w-full text-left border rounded-2xl p-4 transition-all ${
                    selectedAssignmentId === a.id
                      ? "border-emerald-300 bg-emerald-50 shadow-sm"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{a.title}</p>
                      {a.lesson && (
                        <p className="text-xs text-slate-500 mt-1">
                          Урок: <span className="font-semibold">{a.lesson.title}</span>
                        </p>
                      )}
                      {a.dueAt && (
                        <p className="text-xs text-slate-500 mt-1">
                          Дедлайн: {new Date(a.dueAt).toLocaleString("ru-RU")}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        {a.type === "AUDIO" ? "Аудио" : "Текст"}
                      </span>
                      {a.submittedCount > 0 && (
                        <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                          На проверке: {a.pendingCount}/{a.submittedCount}
                        </span>
                      )}
                    </div>
                  </div>
                  {a.description && (
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2">{a.description}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Submission list ── */}
        <div className="lg:w-1/2">
          <h3 className="text-lg font-bold text-slate-800 mb-4">
            Работы{" "}
            {currentAssignment && (
              <span className="text-sm font-semibold text-slate-500">
                — {currentAssignment.title}
              </span>
            )}
          </h3>

          {!currentAssignment ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
              Выберите задание слева, чтобы увидеть работы учеников.
            </div>
          ) : subLoading ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
              Загрузка работ...
            </div>
          ) : subError ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
              {subError}
            </div>
          ) : submissions.length === 0 ? (
            <EmptyState
              icon="📭"
              title="Пока нет сдач по этому заданию"
              description="Когда ученики начнут сдавать, их работы появятся здесь."
            />
          ) : (
            <div className="space-y-3">
              {submissions.map((s) => (
                <SubmissionCard
                  key={s.id}
                  submission={s}
                  onCheck={(submissionId, status, comment, gradeVal) => {
                    onCheckSubmission(submissionId, status, comment, gradeVal);
                    setSubmissions((prev) =>
                      prev.map((sub) =>
                        sub.id === submissionId
                          ? {
                              ...sub,
                              status,
                              teacherComment: comment || sub.teacherComment,
                              grade: gradeVal ?? sub.grade,
                            }
                          : sub,
                      ),
                    );
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
