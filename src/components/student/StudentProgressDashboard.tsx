"use client";

import React, { useEffect, useState } from "react";
import StreamProgressCard from "./StreamProgressCard";
import ProgressMetricCard from "./ProgressMetricCard";

interface StreamProgress {
  streamId: string;
  streamName: string;
  courseName: string;
  lessonsCompleted: number;
  lessonsTotal: number;
  quizzesPassed: number;
  quizzesTotal: number;
  averageQuizScore: number | null;
  homeworksAccepted: number;
  homeworksTotal: number;
  totalWatchTimeHours: number;
  lastActivityAt?: Date;
}

interface StudentProgressDashboardProps {
  onViewDetails?: (streamId: string) => void;
}

export default function StudentProgressDashboard({
  onViewDetails,
}: StudentProgressDashboardProps) {
  const [streams, setStreams] = useState<StreamProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/progress");
      if (!res.ok) throw new Error("Не удалось загрузить прогресс");
      const data = await res.json();
      setStreams(data.streams || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  // Calculate overall metrics across all streams
  const totalLessons = streams.reduce((sum, s) => sum + s.lessonsCompleted, 0);
  const totalLessonsAvailable = streams.reduce(
    (sum, s) => sum + s.lessonsTotal,
    0
  );
  const totalQuizzes = streams.reduce((sum, s) => sum + s.quizzesPassed, 0);
  const totalQuizzesAvailable = streams.reduce(
    (sum, s) => sum + s.quizzesTotal,
    0
  );
  const totalHomeworks = streams.reduce(
    (sum, s) => sum + s.homeworksAccepted,
    0
  );
  const totalHomeworksAvailable = streams.reduce(
    (sum, s) => sum + s.homeworksTotal,
    0
  );
  const totalWatchTime = streams.reduce(
    (sum, s) => sum + s.totalWatchTimeHours,
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4" />
          <p className="text-slate-400">Загрузка прогресса...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
        <p className="text-red-400 font-bold mb-2">Ошибка</p>
        <p className="text-slate-400">{error}</p>
        <button
          onClick={fetchProgress}
          className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">📚</div>
        <h3 className="text-2xl font-bold text-white mb-2">
          Вы пока не записаны ни на один поток
        </h3>
        <p className="text-slate-400">
          Запишитесь на курс, чтобы начать обучение и отслеживать свой прогресс
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overall metrics */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Общий прогресс</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ProgressMetricCard
            icon="📚"
            label="Уроки"
            value={totalLessons}
            total={totalLessonsAvailable}
            color="emerald"
          />
          <ProgressMetricCard
            icon="📝"
            label="Тесты"
            value={totalQuizzes}
            total={totalQuizzesAvailable}
            color="blue"
          />
          <ProgressMetricCard
            icon="✍️"
            label="Домашние задания"
            value={totalHomeworks}
            total={totalHomeworksAvailable}
            color="amber"
          />
          <ProgressMetricCard
            icon="⏱"
            label="Время обучения"
            value={Math.round(totalWatchTime * 10) / 10}
            percentage={100}
            color="purple"
          />
        </div>
      </div>

      {/* Progress by stream */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Прогресс по потокам</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {streams.map((stream) => (
            <StreamProgressCard
              key={stream.streamId}
              progress={stream}
              onClick={
                onViewDetails
                  ? () => onViewDetails(stream.streamId)
                  : undefined
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
