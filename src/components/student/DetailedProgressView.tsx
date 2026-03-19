"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, FlaskConical, FileText, TrendingUp, Loader2 } from "lucide-react";
import ActivityTimeline from "./ActivityTimeline";

interface LessonProgress {
  lessonId: string;
  title: string;
  type: string;
  completed: boolean;
  watchedSeconds: number;
  totalSeconds: number;
  watchProgress: number;
  lastWatchedAt?: Date;
}

interface QuizSubmission {
  submissionId: string;
  quizId: string;
  lessonId: string;
  lessonTitle: string;
  status: string;
  submittedAt: Date;
  checkedAt?: Date;
}

interface HomeworkSubmission {
  submissionId: string;
  assignmentId: string;
  title: string;
  status: string;
  grade?: number;
  submittedAt: Date;
  checkedAt?: Date;
  dueDate?: Date;
}

interface DetailedProgressViewProps {
  streamId: string;
  onBack?: () => void;
}

export default function DetailedProgressView({
  streamId,
  onBack,
}: DetailedProgressViewProps) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDetailedProgress();
  }, [streamId]);

  const fetchDetailedProgress = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/student/progress/${streamId}`);
      if (!res.ok) throw new Error("Не удалось загрузить детальный прогресс");
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-500 mx-auto mb-4 animate-spin" />
          <p className="text-slate-400">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
        <p className="text-red-400 font-bold mb-2 text-lg">Ошибка</p>
        <p className="text-slate-400">{error}</p>
      </div>
    );
  }

  const { overview, lessons, quizzes, homeworks } = data;

  // Build timeline events
  const timelineEvents = [
    ...lessons
      .filter((l: LessonProgress) => l.completed)
      .map((l: LessonProgress) => ({
        id: `lesson-${l.lessonId}`,
        type: "lesson" as const,
        title: l.title,
        status: "completed",
        timestamp: l.lastWatchedAt || new Date(),
      })),
    ...quizzes.map((q: QuizSubmission) => ({
      id: `quiz-${q.submissionId}`,
      type: "quiz" as const,
      title: `Тест: ${q.lessonTitle}`,
      status: q.status,
      timestamp: q.checkedAt || q.submittedAt,
    })),
    ...homeworks.map((h: HomeworkSubmission) => ({
      id: `homework-${h.submissionId}`,
      type: "homework" as const,
      title: h.title,
      status: h.status,
      timestamp: h.checkedAt || h.submittedAt,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all shadow-sm hover:shadow"
          >
            <ArrowLeft className="w-5 h-5" />
            Назад
          </button>
        )}
        <div>
          <h2 className="text-3xl font-bold text-white">{overview.streamName}</h2>
          <p className="text-slate-400 mt-1">{overview.courseName}</p>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-sm text-slate-400 font-semibold">Уроки</div>
          </div>
          <div className="text-3xl font-bold text-emerald-400">
            {overview.lessonsCompleted}/{overview.lessonsTotal}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-blue-500/30 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-sm text-slate-400 font-semibold">Тесты</div>
          </div>
          <div className="text-3xl font-bold text-blue-400">
            {overview.quizzesPassed}/{overview.quizzesTotal}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-amber-500/30 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-sm text-slate-400 font-semibold">Домашние задания</div>
          </div>
          <div className="text-3xl font-bold text-amber-400">
            {overview.homeworksAccepted}/{overview.homeworksTotal}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-purple-500/30 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-sm text-slate-400 font-semibold">Средний балл</div>
          </div>
          <div className="text-3xl font-bold text-purple-400">
            {overview.averageQuizScore || "—"}
            {overview.averageQuizScore && "%"}
          </div>
        </div>
      </div>

      {/* Lessons progress */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-emerald-400" />
          Прогресс по урокам
        </h3>
        <div className="space-y-4">
          {lessons.map((lesson: LessonProgress) => (
            <div
              key={lesson.lessonId}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-white text-lg">{lesson.title}</h4>
                {lesson.completed && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                    <BookOpen className="w-3.5 h-3.5" />
                    Завершено
                  </span>
                )}
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${lesson.watchProgress}%` }}
                />
              </div>
              <div className="mt-3 text-sm text-slate-400 font-semibold">
                Просмотрено: {lesson.watchProgress}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity timeline */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-6">Последняя активность</h3>
        <ActivityTimeline events={timelineEvents.slice(0, 10)} />
      </div>
    </div>
  );
}
