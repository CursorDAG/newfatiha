"use client";

import { useState, useEffect } from "react";

interface Report {
  id: string;
  contentType: "LESSON" | "QUIZ" | "HOMEWORK" | "CHAT_MESSAGE";
  contentId: string;
  reason: "INAPPROPRIATE" | "SPAM" | "COPYRIGHT" | "OTHER";
  description: string | null;
  reporter: {
    id: string;
    name: string;
    email: string;
  };
}

interface Props {
  reportId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ReportReviewModal({ reportId, onClose, onUpdate }: Props) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch(`/api/moderator/reports?limit=100`);
        const data = await response.json();
        const foundReport = data.reports?.find((r: Report) => r.id === reportId);
        setReport(foundReport || null);
      } catch (error) {
        console.error("Failed to fetch report:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  const handleReview = async (action: "APPROVE" | "REJECT") => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/moderator/reports/${reportId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment: comment || undefined }),
      });

      if (response.ok) {
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error("Failed to review report:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const getContentTypeText = (type: string) => {
    switch (type) {
      case "LESSON":
        return "Урок";
      case "QUIZ":
        return "Тест";
      case "HOMEWORK":
        return "Домашнее задание";
      case "CHAT_MESSAGE":
        return "Сообщение в чате";
      default:
        return type;
    }
  };

  const getReasonText = (reason: string) => {
    switch (reason) {
      case "INAPPROPRIATE":
        return "Неприемлемый контент";
      case "SPAM":
        return "Спам";
      case "COPYRIGHT":
        return "Нарушение авторских прав";
      case "OTHER":
        return "Другое";
      default:
        return reason;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-start">
          <h2 className="text-xl font-bold text-slate-900">
            Рассмотрение жалобы
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : report ? (
          <>
            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Тип контента
                </label>
                <div className="text-slate-900">{getContentTypeText(report.contentType)}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Причина жалобы
                </label>
                <div className="text-slate-900">{getReasonText(report.reason)}</div>
              </div>

              {report.description && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Описание
                  </label>
                  <div className="text-slate-900 bg-slate-50 rounded p-3 whitespace-pre-wrap">
                    {report.description}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Отправитель
                </label>
                <div className="text-slate-900">{report.reporter.name}</div>
                <div className="text-sm text-slate-500">{report.reporter.email}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ID контента
                </label>
                <div className="text-sm text-slate-500 font-mono">{report.contentId}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Комментарий (опционально)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Добавьте комментарий к решению..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => handleReview("REJECT")}
                disabled={submitting}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Отклонить жалобу
              </button>
              <button
                onClick={() => handleReview("APPROVE")}
                disabled={submitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? "Обработка..." : "Одобрить и удалить контент"}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 py-12">
            Жалоба не найдена
          </div>
        )}
      </div>
    </div>
  );
}
