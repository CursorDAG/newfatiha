"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ClipboardCheck, RefreshCw, BookOpen, User, Volume2, CheckCircle, XCircle, X } from "lucide-react";

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
  quizSubmissions?: Array<{
    id: string;
    status: string;
    questionDetails?: unknown;
  }>;
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

type QuestionDetail = {
  questionId: string;
  prompt: string;
  type: "MULTIPLE_CHOICE" | "VOICE" | "TEXT";
  submissionId: string;
  status: "SUBMITTED" | "PASSED" | "FAILED";
  selectedOptionId?: string;
  selectedOptionText?: string;
  correctOptionId?: string;
  correctOptionText?: string;
  isCorrect?: boolean;
  textAnswer?: string;
  voiceMimeType?: string;
  voiceDurationMs?: number;
  voiceUrl?: string;
  hasVoiceData?: boolean;
};

type QuizSubmissionDetails = {
  quizTitle: string;
  studentName: string;
  lessonTitle: string;
  overallStatus: "SUBMITTED" | "PASSED" | "FAILED";
  questions: QuestionDetail[];
};

function statusBadgeForHomework(status: GradebookHomeworkStatus) {
  switch (status) {
    case "ACCEPTED":
      return { variant: "success" as const, label: "Принято" };
    case "NEEDS_REWORK":
      return { variant: "warning" as const, label: "Доработать" };
    case "REJECTED":
      return { variant: "error" as const, label: "Отклонено" };
    case "SUBMITTED":
      return { variant: "info" as const, label: "На проверке" };
    case "NOT_ASSIGNED":
      return { variant: "neutral" as const, label: "Нет" };
    case "NO_SUBMISSION":
      return { variant: "neutral" as const, label: "Не сдано" };
    default:
      return { variant: "neutral" as const, label: "—" };
  }
}

function statusBadgeForQuiz(status: GradebookQuizStatus) {
  switch (status) {
    case "PASSED":
      return { variant: "success" as const, label: "Пройден" };
    case "FAILED":
      return { variant: "error" as const, label: "Не пройден" };
    case "SUBMITTED":
      return { variant: "info" as const, label: "На проверке" };
    case "NO_SUBMISSION":
      return { variant: "neutral" as const, label: "Не сдан" };
    default:
      return { variant: "neutral" as const, label: "—" };
  }
}

function QuizDetailsModal({
  details,
  onClose,
}: {
  details: QuizSubmissionDetails;
  onClose: () => void;
}) {
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  const handlePlayAudio = (submissionId: string) => {
    if (playingAudio === submissionId) {
      setPlayingAudio(null);
      return;
    }
    setPlayingAudio(submissionId);
    const audioUrl = `/api/teacher/question-submissions/${submissionId}/audio`;
    const audio = new Audio(audioUrl);
    audio.onended = () => setPlayingAudio(null);
    audio.onerror = () => {
      console.error("Failed to load audio");
      setPlayingAudio(null);
    };
    audio.play();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">{details.quizTitle}</h3>
              <p className="text-sm text-slate-600 mt-1">
                {details.studentName} • {details.lessonTitle}
              </p>
              <div className="mt-2">
                <Badge
                  variant={
                    details.overallStatus === "PASSED"
                      ? "success"
                      : details.overallStatus === "FAILED"
                      ? "error"
                      : "info"
                  }
                >
                  {details.overallStatus === "PASSED"
                    ? "Пройден"
                    : details.overallStatus === "FAILED"
                    ? "Не пройден"
                    : "На проверке"}
                </Badge>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {details.questions.map((q, idx) => (
            <Card key={q.questionId} padding="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 mb-3">{q.prompt}</p>

                  {q.type === "MULTIPLE_CHOICE" && (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-slate-600 font-medium">Ответ студента:</span>
                        <span className="text-sm text-slate-900">{q.selectedOptionText || "—"}</span>
                        {q.isCorrect ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      {!q.isCorrect && q.correctOptionText && (
                        <div className="flex items-start gap-2">
                          <span className="text-sm text-slate-600 font-medium">Правильный ответ:</span>
                          <span className="text-sm text-green-700 font-semibold">{q.correctOptionText}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {q.type === "TEXT" && (
                    <div className="space-y-2">
                      <span className="text-sm text-slate-600 font-medium">Ответ студента:</span>
                      <div className="bg-slate-50 rounded p-3 text-sm text-slate-900">
                        {q.textAnswer || "—"}
                      </div>
                    </div>
                  )}

                  {q.type === "VOICE" && q.hasVoiceData && q.submissionId && (
                    <div className="space-y-2">
                      <span className="text-sm text-slate-600 font-medium">Голосовой ответ:</span>
                      <button
                        onClick={() => handlePlayAudio(q.submissionId)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {playingAudio === q.submissionId ? "Воспроизведение..." : "Прослушать"}
                        </span>
                        {q.voiceDurationMs && (
                          <span className="text-xs text-emerald-600">
                            ({Math.round(q.voiceDurationMs / 1000)}с)
                          </span>
                        )}
                      </button>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                    <Badge
                      variant={
                        q.status === "PASSED"
                          ? "success"
                          : q.status === "FAILED"
                          ? "error"
                          : "info"
                      }
                      size="sm"
                    >
                      {q.status === "PASSED"
                        ? "Верно"
                        : q.status === "FAILED"
                        ? "Неверно"
                        : "На проверке"}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="p-6 border-t border-slate-200">
          <Button onClick={onClose} variant="secondary" size="lg" className="w-full">
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  );
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
  const [quizDetailsModal, setQuizDetailsModal] = useState<QuizSubmissionDetails | null>(null);

  const handleOpenQuizDetails = (
    cell: GradebookCell,
    lessonTitle: string,
    studentName: string
  ) => {
    if (!cell.quizSubmissions || cell.quizSubmissions.length === 0) {
      return;
    }

    const submission = cell.quizSubmissions[0];
    const questionDetails = submission.questionDetails as QuestionDetail[] | undefined;

    if (!questionDetails || !Array.isArray(questionDetails)) {
      console.error("No question details found in submission");
      return;
    }

    const details: QuizSubmissionDetails = {
      quizTitle: "Тест",
      studentName,
      lessonTitle,
      overallStatus: submission.status as "SUBMITTED" | "PASSED" | "FAILED",
      questions: questionDetails,
    };

    setQuizDetailsModal(details);
  };

  const handleCloseQuizDetails = () => {
    setQuizDetailsModal(null);
  };
  if (!hasStream) {
    return (
      <div className="p-8 flex-1">
        <Card padding="p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClipboardCheck className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Выберите поток</h3>
            <p className="text-slate-600">Выберите поток слева вверху, чтобы увидеть журнал</p>
          </div>
        </Card>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="p-8 flex-1">
        <Card padding="p-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600 font-semibold">Загрузка журнала...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 flex-1">
        <Card padding="p-8" className="bg-red-50 border-red-200">
          <div className="text-center space-y-4">
            <p className="text-red-700 font-semibold">Не удалось загрузить журнал</p>
            <p className="text-sm text-red-600">{error}</p>
            <Button size="sm" variant="secondary" onClick={onRefresh} icon={<RefreshCw className="w-4 h-4" />}>
              Попробовать ещё раз
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!data || data.students.length === 0 || data.lessons.length === 0) {
    return (
      <div className="p-8 flex-1">
        <Card padding="p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Журнал пока пуст</h3>
            <p className="text-slate-600">Нужны хотя бы один урок и один ученик в потоке, чтобы построить журнал</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 flex-1 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Журнал</h2>
          <p className="text-sm text-slate-600 mt-2">
            Поток {data.stream.name} • курс {data.stream.courseTitle}
          </p>
        </div>
        <Button size="lg" variant="secondary" onClick={onRefresh} icon={<RefreshCw className="w-5 h-5" />}>
          Обновить
        </Button>
      </div>

      <Card padding="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="sticky left-0 z-10 bg-slate-50 px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Ученик
                </th>
                {data.lessons.map((lesson) => (
                  <th
                    key={lesson.id}
                    className="px-4 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wide min-w-[160px]"
                  >
                    <div className="truncate mb-2" title={lesson.title}>
                      {lesson.title}
                    </div>
                    <div className="flex gap-1">
                      {lesson.hasHomework && <Badge variant="info" size="sm">Д/З</Badge>}
                      {lesson.hasQuiz && <Badge variant="warning" size="sm">Тест</Badge>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.students.map((student) => (
                <tr key={student.enrollmentId} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="sticky left-0 z-10 bg-white px-6 py-4">
                    <button
                      type="button"
                      onClick={() => onOpenStudent(student.enrollmentId)}
                      className="flex items-center gap-3 text-left w-full hover:opacity-80 transition-opacity"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{student.name}</p>
                        <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Профиль
                        </p>
                      </div>
                    </button>
                  </td>
                  {student.cells.map((cell) => {
                    const hwConfig = statusBadgeForHomework(cell.homeworkStatus);
                    const quizConfig = statusBadgeForQuiz(cell.quizStatus);
                    const lesson = data.lessons.find((l) => l.id === cell.lessonId);
                    const hasQuizSubmission = cell.quizSubmissions && cell.quizSubmissions.length > 0;

                    return (
                      <td key={cell.lessonId} className="px-4 py-4 align-top">
                        <div className="flex flex-col gap-2">
                          <Badge variant={hwConfig.variant} size="sm">
                            Д/З: {hwConfig.label}
                          </Badge>
                          {hasQuizSubmission ? (
                            <button
                              onClick={() =>
                                handleOpenQuizDetails(
                                  cell,
                                  lesson?.title || "Урок",
                                  student.name
                                )
                              }
                              className="text-left hover:opacity-80 transition-opacity"
                            >
                              <Badge variant={quizConfig.variant} size="sm">
                                Тест: {quizConfig.label}
                              </Badge>
                            </button>
                          ) : (
                            <Badge variant={quizConfig.variant} size="sm">
                              Тест: {quizConfig.label}
                            </Badge>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {quizDetailsModal && (
        <QuizDetailsModal details={quizDetailsModal} onClose={handleCloseQuizDetails} />
      )}
    </div>
  );
}

