"use client";

import { useState, useEffect } from "react";
import ReportReviewModal from "./ReportReviewModal";

type ReportStatus = "PENDING" | "APPROVED" | "REJECTED";
type ContentType = "LESSON" | "QUIZ" | "HOMEWORK" | "CHAT_MESSAGE";
type ReportReason = "INAPPROPRIATE" | "SPAM" | "COPYRIGHT" | "OTHER";

interface Report {
  id: string;
  contentType: ContentType;
  contentId: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  createdAt: string;
  reporter: {
    id: string;
    name: string;
    email: string;
  };
  reviewedBy: {
    id: string;
    name: string;
  } | null;
  reviewedAt: string | null;
}

export default function ModeratorReportsTab() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "ALL">("PENDING");
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentType | "ALL">("ALL");
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (contentTypeFilter !== "ALL") params.append("contentType", contentTypeFilter);

      const response = await fetch(`/api/moderator/reports?${params}`);
      const data = await response.json();
      setReports(data.reports || []);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter, contentTypeFilter]);

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case "PENDING":
        return "text-yellow-600 bg-yellow-50";
      case "APPROVED":
        return "text-red-600 bg-red-50";
      case "REJECTED":
        return "text-green-600 bg-green-50";
    }
  };

  const getStatusText = (status: ReportStatus) => {
    switch (status) {
      case "PENDING":
        return "Ожидает";
      case "APPROVED":
        return "Одобрено";
      case "REJECTED":
        return "Отклонено";
    }
  };

  const getContentTypeText = (type: ContentType) => {
    switch (type) {
      case "LESSON":
        return "Урок";
      case "QUIZ":
        return "Тест";
      case "HOMEWORK":
        return "ДЗ";
      case "CHAT_MESSAGE":
        return "Сообщение";
    }
  };

  const getReasonText = (reason: ReportReason) => {
    switch (reason) {
      case "INAPPROPRIATE":
        return "Неприемлемый контент";
      case "SPAM":
        return "Спам";
      case "COPYRIGHT":
        return "Нарушение авторских прав";
      case "OTHER":
        return "Другое";
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Статус
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReportStatus | "ALL")}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Все</option>
            <option value="PENDING">Ожидает</option>
            <option value="APPROVED">Одобрено</option>
            <option value="REJECTED">Отклонено</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Тип контента
          </label>
          <select
            value={contentTypeFilter}
            onChange={(e) => setContentTypeFilter(e.target.value as ContentType | "ALL")}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Все</option>
            <option value="LESSON">Урок</option>
            <option value="QUIZ">Тест</option>
            <option value="HOMEWORK">ДЗ</option>
            <option value="CHAT_MESSAGE">Сообщение</option>
          </select>
        </div>
      </div>

      {/* Reports Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          Жалоб не найдено
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Тип
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Причина
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Описание
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Отправитель
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Дата
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">
                      {getContentTypeText(report.contentType)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">
                      {getReasonText(report.reason)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-900 max-w-xs truncate">
                      {report.description || "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{report.reporter.name}</div>
                    <div className="text-sm text-slate-500">{report.reporter.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                        report.status
                      )}`}
                    >
                      {getStatusText(report.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {new Date(report.createdAt).toLocaleDateString("ru-RU")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {report.status === "PENDING" && (
                      <button
                        onClick={() => setSelectedReport(report.id)}
                        className="text-emerald-600 hover:text-emerald-900"
                      >
                        Рассмотреть
                      </button>
                    )}
                    {report.status !== "PENDING" && report.reviewedBy && (
                      <div className="text-slate-500">
                        {report.reviewedBy.name}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Report Review Modal */}
      {selectedReport && (
        <ReportReviewModal
          reportId={selectedReport}
          onClose={() => setSelectedReport(null)}
          onUpdate={fetchReports}
        />
      )}
    </div>
  );
}
