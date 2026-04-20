"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Plus, RefreshCw, FileText, Calendar, User, CheckCircle, AlertCircle } from "lucide-react";

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
    <Modal
      open={true}
      onClose={onClose}
      title="Новое задание"
      subtitle="Создать домашнее задание для потока"
      maxWidth="max-w-xl"
      footer={
        <div className="flex gap-3">
          <Button
            variant="primary"
            disabled={!title.trim() || submitting}
            onClick={handleSubmit}
            loading={submitting}
          >
            Создать
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Название <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Напишите задание..."
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Описание</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Дополнительные инструкции..."
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Тип</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "TEXT" | "AUDIO")}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="TEXT">Текстовое</option>
              <option value="AUDIO">Аудио</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Дедлайн</label>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {lessons.length > 0 && (
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Привязать к уроку <span className="text-slate-400 font-normal">(необязательно)</span>
            </label>
            <select
              value={lessonId}
              onChange={(e) => setLessonId(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
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
      </div>
    </Modal>
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

  const statusConfig = {
    ACCEPTED: { variant: "success" as const, label: "Принято", icon: <CheckCircle className="w-3 h-3" /> },
    NEEDS_REWORK: { variant: "warning" as const, label: "Нужно доработать", icon: <AlertCircle className="w-3 h-3" /> },
    REJECTED: { variant: "error" as const, label: "Отклонено", icon: <AlertCircle className="w-3 h-3" /> },
    SUBMITTED: { variant: "info" as const, label: "На проверке", icon: <AlertCircle className="w-3 h-3" /> },
  };

  const config = statusConfig[submission.status];
  const parsedGrade = grade !== "" ? Number(grade) : null;

  return (
    <Card padding="p-6" hoverable>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              {submission.student.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 truncate">{submission.student.name}</p>
              <p className="text-xs text-slate-600 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(submission.submittedAt).toLocaleString("ru-RU")}
              </p>
            </div>
          </div>
          <Badge variant={config.variant} size="md" icon={config.icon}>
            {config.label}
          </Badge>
        </div>

        {submission.contentText && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap">
            {submission.contentText}
          </div>
        )}
        {submission.contentUrl && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <audio controls className="w-full">
              <source src={submission.contentUrl} />
            </audio>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Комментарий учителя
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Оставьте комментарий..."
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Оценка <span className="text-slate-400 font-normal">(необязательно)</span>
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="0 – 100"
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onCheck(submission.id, "NEEDS_REWORK", comment, parsedGrade)}
          >
            Попросить доработать
          </Button>
          <Button
            size="sm"
            variant="success"
            onClick={() => onCheck(submission.id, "ACCEPTED", comment, parsedGrade)}
            icon={<CheckCircle className="w-4 h-4" />}
          >
            Принять
          </Button>
        </div>
      </div>
    </Card>
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
    <div className="p-4 sm:p-6 lg:p-8 flex-1">
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg sm:text-2xl font-bold text-slate-900">Домашние задания</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={onRefresh} icon={<RefreshCw className="w-4 h-4" />}>
                Обновить
              </Button>
              {streamId && (
                <Button size="sm" variant="primary" onClick={() => setCreateOpen(true)} icon={<Plus className="w-4 h-4" />}>
                  Задание
                </Button>
              )}
            </div>
          </div>

          {!streamId ? (
            <Card padding="p-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Выберите поток</h3>
                <p className="text-slate-600">Выберите поток, чтобы увидеть задания</p>
              </div>
            </Card>
          ) : loading ? (
            <Card padding="p-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-600 font-semibold">Загрузка заданий...</p>
              </div>
            </Card>
          ) : assignments.length === 0 ? (
            <Card padding="p-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">В этом потоке пока нет домашних заданий</h3>
                <p className="text-slate-600 mb-6">Нажмите «Задание», чтобы создать первое</p>
                <Button size="sm" variant="primary" onClick={() => setCreateOpen(true)} icon={<Plus className="w-4 h-4" />}>
                  Создать задание
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {assignments.map((a) => (
                <Card
                  key={a.id}
                  padding="p-6"
                  hoverable
                  className={`cursor-pointer transition-all ${
                    selectedAssignmentId === a.id
                      ? "ring-2 ring-emerald-500 bg-emerald-50"
                      : ""
                  }`}
                  onClick={() => setSelectedAssignmentId(a.id)}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-base text-slate-900 mb-2">{a.title}</h4>
                      {a.lesson && (
                        <p className="text-sm text-slate-600 mb-2 flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          Урок: <span className="font-semibold">{a.lesson.title}</span>
                        </p>
                      )}
                      {a.dueAt && (
                        <p className="text-sm text-slate-600 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Дедлайн: {new Date(a.dueAt).toLocaleString("ru-RU")}
                        </p>
                      )}
                      {a.description && (
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2">{a.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge variant="neutral" size="sm">
                        {a.type === "AUDIO" ? "Аудио" : "Текст"}
                      </Badge>
                      {a.submittedCount > 0 && (
                        <Badge variant="warning" size="sm">
                          На проверке: {a.pendingCount}/{a.submittedCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* ── Submission list ── */}
        <div className="lg:w-1/2">
          <h3 className="text-lg font-bold text-slate-900 mb-6">
            Работы
            {currentAssignment && (
              <span className="text-base font-semibold text-slate-600 ml-2">
                — {currentAssignment.title}
              </span>
            )}
          </h3>

          {!currentAssignment ? (
            <Card padding="p-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Выберите задание</h3>
                <p className="text-slate-600">Выберите задание слева, чтобы увидеть работы учеников</p>
              </div>
            </Card>
          ) : subLoading ? (
            <Card padding="p-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-600 font-semibold">Загрузка работ...</p>
              </div>
            </Card>
          ) : subError ? (
            <Card padding="p-8" className="bg-red-50 border-red-200">
              <p className="text-sm text-red-700 text-center">{subError}</p>
            </Card>
          ) : submissions.length === 0 ? (
            <Card padding="p-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-slate-400" />
                </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">Пока нет сдач по этому заданию</h3>
                <p className="text-slate-600">Когда ученики начнут сдавать, их работы появятся здесь</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
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
