"use client";

import React from "react";
import { BookOpen, FlaskConical, FileText, Clock, LucideIcon } from "lucide-react";

interface ProgressMetricCardProps {
  icon: string;
  label: string;
  value: number;
  total?: number;
  percentage?: number;
  color?: "emerald" | "blue" | "amber" | "purple";
}

const iconMap: Record<string, LucideIcon> = {
  "📚": BookOpen,
  "📝": FlaskConical,
  "✍️": FileText,
  "⏱": Clock,
};

export default function ProgressMetricCard({
  icon,
  label,
  value,
  total,
  percentage,
  color = "emerald",
}: ProgressMetricCardProps) {
  const colorClasses = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };

  const progressColorClasses = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    purple: "bg-purple-500",
  };

  const displayPercentage =
    percentage !== undefined
      ? percentage
      : total && total > 0
        ? Math.round((value / total) * 100)
        : 0;

  const IconComponent = iconMap[icon] || BookOpen;

  return (
    <div
      className={`border rounded-2xl p-6 ${colorClasses[color]} transition-all hover:scale-105 hover:shadow-lg`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
          <IconComponent className="w-6 h-6" />
        </div>
        <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">
          {label}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-white">
            {value}
          </span>
          {total !== undefined && (
            <span className="text-xl text-slate-400">/ {total}</span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full ${progressColorClasses[color]} transition-all duration-500`}
          style={{ width: `${Math.min(displayPercentage, 100)}%` }}
        />
      </div>

      <div className="mt-2 text-right">
        <span className="text-sm font-bold text-slate-400">
          {displayPercentage}%
        </span>
      </div>
    </div>
  );
}
