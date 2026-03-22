"use client";

import React from "react";
import { BookOpen, FlaskConical, FileText, Clock, TrendingUp } from "lucide-react";

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
}

interface StreamProgressCardProps {
  progress: StreamProgress;
  onClick?: () => void;
}

export default function StreamProgressCard({
  progress,
  onClick,
}: StreamProgressCardProps) {
  // Calculate weighted overall progress
  const lessonsPercent =
    progress.lessonsTotal > 0
      ? (progress.lessonsCompleted / progress.lessonsTotal) * 100
      : 0;
  const quizzesPercent =
    progress.quizzesTotal > 0
      ? (progress.quizzesPassed / progress.quizzesTotal) * 100
      : 0;
  const homeworksPercent =
    progress.homeworksTotal > 0
      ? (progress.homeworksAccepted / progress.homeworksTotal) * 100
      : 0;

  // Weighted average: lessons 40%, quizzes 30%, homeworks 30%
  const overallProgress = Math.round(
    lessonsPercent * 0.4 + quizzesPercent * 0.3 + homeworksPercent * 0.3
  );

  const getProgressColor = (percent: number) => {
    if (percent >= 80) return "text-emerald-400";
    if (percent >= 50) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <div
      onClick={onClick}
      className={`bg-slate-900 border border-slate-800 rounded-2xl p-8 transition-all ${
        onClick ? "cursor-pointer hover:border-emerald-500/50 hover:scale-105 hover:shadow-xl" : ""
      }`}
    >
      {/* Header */}
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-white mb-2">
          {progress.streamName}
        </h3>
        <p className="text-sm text-slate-400">{progress.courseName}</p>
      </div>

      {/* Circular progress */}
      <div className="flex items-center justify-center mb-8">
        <div className="relative w-36 h-36">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="72"
              cy="72"
              r="64"
              stroke="currentColor"
              strokeWidth="10"
              fill="none"
              className="text-slate-800"
            />
            <circle
              cx="72"
              cy="72"
              r="64"
              stroke="currentColor"
              strokeWidth="10"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 64}`}
              strokeDashoffset={`${2 * Math.PI * 64 * (1 - overallProgress / 100)}`}
              className={`${getProgressColor(overallProgress)} transition-all duration-500`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${getProgressColor(overallProgress)}`}>
              {overallProgress}%
            </span>
            <TrendingUp className={`w-5 h-5 mt-1 ${getProgressColor(overallProgress)}`} />
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center mb-6">
        <div>
          <div className="flex justify-center mb-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {progress.lessonsCompleted}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            из {progress.lessonsTotal} уроков
          </div>
        </div>
        <div>
          <div className="flex justify-center mb-2">
            <FlaskConical className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {progress.quizzesPassed}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            из {progress.quizzesTotal} тестов
          </div>
        </div>
        <div>
          <div className="flex justify-center mb-2">
            <FileText className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {progress.homeworksAccepted}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            из {progress.homeworksTotal} ДЗ
          </div>
        </div>
      </div>

      {/* Additional info */}
      <div className="pt-6 border-t border-slate-800 flex items-center justify-between text-sm">
        {progress.averageQuizScore !== null && (
          <div className="text-slate-400 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Средний балл:{" "}
            <span className="font-bold text-white">
              {progress.averageQuizScore}%
            </span>
          </div>
        )}
        <div className="text-slate-400 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {progress.totalWatchTimeHours}ч
        </div>
      </div>
    </div>
  );
}
