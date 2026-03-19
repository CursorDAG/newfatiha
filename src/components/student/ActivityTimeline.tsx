"use client";

import React from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { BookOpen, FlaskConical, FileText, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";

interface TimelineEvent {
  id: string;
  type: "lesson" | "quiz" | "homework";
  title: string;
  status: string;
  timestamp: Date;
}

interface ActivityTimelineProps {
  events: TimelineEvent[];
}

export default function ActivityTimeline({ events }: ActivityTimelineProps) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case "lesson":
        return BookOpen;
      case "quiz":
        return FlaskConical;
      case "homework":
        return FileText;
      default:
        return BookOpen;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PASSED":
      case "ACCEPTED":
      case "completed":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "FAILED":
      case "REJECTED":
        return "text-red-400 bg-red-500/10 border-red-500/20";
      case "NEEDS_REWORK":
      case "SUBMITTED":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      default:
        return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PASSED":
      case "ACCEPTED":
      case "completed":
        return CheckCircle2;
      case "FAILED":
      case "REJECTED":
        return XCircle;
      case "NEEDS_REWORK":
        return AlertCircle;
      case "SUBMITTED":
        return Clock;
      default:
        return Clock;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PASSED: "Пройден",
      FAILED: "Не пройден",
      ACCEPTED: "Принято",
      REJECTED: "Отклонено",
      NEEDS_REWORK: "Требует доработки",
      SUBMITTED: "Отправлено",
      completed: "Завершено",
    };
    return labels[status] || status;
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
        <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-lg font-semibold">Пока нет активности</p>
        <p className="text-sm mt-2">
          Начните изучать уроки, чтобы увидеть вашу активность здесь
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {events.map((event, index) => {
        const EventIcon = getEventIcon(event.type);
        const StatusIcon = getStatusIcon(event.status);

        return (
          <div key={event.id} className="flex gap-5">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center shrink-0">
                <EventIcon className="w-6 h-6 text-emerald-400" />
              </div>
              {index < events.length - 1 && (
                <div className="w-0.5 h-full bg-slate-800 mt-3" />
              )}
            </div>

            {/* Event content */}
            <div className="flex-1 pb-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h4 className="font-bold text-white text-lg">{event.title}</h4>
                  <span
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border shrink-0 ${getStatusColor(event.status)}`}
                  >
                    <StatusIcon className="w-3.5 h-3.5" />
                    {getStatusLabel(event.status)}
                  </span>
                </div>
                <p className="text-sm text-slate-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {format(new Date(event.timestamp), "d MMMM yyyy, HH:mm", {
                    locale: ru,
                  })}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
