"use client";

import { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";

interface TeacherApplication {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
  emailVerifiedAt: string | null;
  profile: {
    bio: string;
    subjects: string[];
    experience: string;
    qualifications: string;
    whatsappPhone: string;
    documentsUrls: string[];
    videoIntroUrl: string | null;
    adminNotes: string | null;
    reviewedBy: { id: string; name: string; email: string } | null;
    reviewedAt: string | null;
    rejectionReason: string | null;
  } | null;
}

export default function TeacherApplicationsPage() {
  const [applications, setApplications] = useState<TeacherApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [selectedApp, setSelectedApp] = useState<TeacherApplication | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") {
        params.set("status", filter);
      }

      const res = await fetch(`/api/admin/teacher-applications?${params}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ошибка загрузки");
      }

      setApplications(data.applications);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleApprove = async () => {
    if (!selectedApp) return;

    setActionLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/teacher-applications/${selectedApp.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ошибка одобрения");
      }

      setShowApproveModal(false);
      setSelectedApp(null);
      setAdminNotes("");
      fetchApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка одобрения");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !rejectionReason.trim()) {
      setError("Укажите причину отклонения");
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/teacher-applications/${selectedApp.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason, adminNotes }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ошибка отклонения");
      }

      setShowRejectModal(false);
      setSelectedApp(null);
      setRejectionReason("");
      setAdminNotes("");
      fetchApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отклонения");
    } finally {
      setActionLoading(false);
    }
  };

  const openWhatsApp = (phone: string) => {
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full px-8 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Заявки учителей</h1>
          <p className="text-slate-600">Рассмотрение заявок на должность учителя</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            {[
              { key: "pending", label: "На рассмотрении" },
              { key: "approved", label: "Одобренные" },
              { key: "rejected", label: "Отклоненные" },
              { key: "all", label: "Все" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as "all" | "pending" | "approved" | "rejected")}
                className={`px-6 py-3 font-medium ${
                  filter === tab.key
                    ? "border-b-2 border-emerald-600 text-emerald-600"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                Заявок не найдено
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="border border-slate-200 rounded-lg p-4 hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{app.name}</h3>
                        <p className="text-sm text-slate-600">{app.email}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          app.status === "ACTIVE"
                            ? "bg-green-100 text-green-800"
                            : app.status === "REJECTED"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {app.status === "ACTIVE"
                          ? "Одобрено"
                          : app.status === "REJECTED"
                          ? "Отклонено"
                          : "На рассмотрении"}
                      </span>
                    </div>

                    {app.profile && (
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-slate-700">Предметы:</span>{" "}
                          <span className="text-slate-600">{app.profile.subjects.join(", ")}</span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">WhatsApp:</span>{" "}
                          <button
                            onClick={() => openWhatsApp(app.profile!.whatsappPhone)}
                            className="text-emerald-600 hover:text-emerald-700"
                          >
                            {app.profile.whatsappPhone}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium"
                      >
                        Подробнее
                      </button>
                      {app.status === "PENDING_APPROVAL" && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedApp(app);
                              setShowApproveModal(true);
                            }}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
                          >
                            Одобрить
                          </button>
                          <button
                            onClick={() => {
                              setSelectedApp(app);
                              setShowRejectModal(true);
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                          >
                            Отклонить
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedApp && !showApproveModal && !showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{selectedApp.name}</h2>
                  <p className="text-slate-600">{selectedApp.email}</p>
                </div>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {selectedApp.profile && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">О себе</h3>
                    <p className="text-slate-700 whitespace-pre-wrap">{selectedApp.profile.bio}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Предметы</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedApp.profile.subjects.map((subject) => (
                        <span key={subject} className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm">
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Опыт преподавания</h3>
                    <p className="text-slate-700 whitespace-pre-wrap">{selectedApp.profile.experience}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Квалификация</h3>
                    <p className="text-slate-700 whitespace-pre-wrap">{selectedApp.profile.qualifications}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">WhatsApp</h3>
                    <button
                      onClick={() => openWhatsApp(selectedApp.profile!.whatsappPhone)}
                      className="text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      {selectedApp.profile.whatsappPhone}
                    </button>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Документы</h3>
                    <div className="space-y-2">
                      {selectedApp.profile.documentsUrls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-emerald-600 hover:text-emerald-700 text-sm truncate"
                        >
                          {url}
                        </a>
                      ))}
                    </div>
                  </div>

                  {selectedApp.profile.videoIntroUrl && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-2">Видео-представление</h3>
                      <a
                        href={selectedApp.profile.videoIntroUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:text-emerald-700"
                      >
                        Открыть видео
                      </a>
                    </div>
                  )}

                  {selectedApp.profile.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h3 className="font-semibold text-red-900 mb-2">Причина отклонения</h3>
                      <p className="text-red-700">{selectedApp.profile.rejectionReason}</p>
                    </div>
                  )}

                  {selectedApp.profile.adminNotes && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <h3 className="font-semibold text-slate-900 mb-2">Заметки администратора</h3>
                      <p className="text-slate-700">{selectedApp.profile.adminNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Одобрить заявку</h2>
            <p className="text-slate-600 mb-4">
              Вы уверены, что хотите одобрить заявку {selectedApp.name}?
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Заметки (опционально)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Внутренние заметки для администрации"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setAdminNotes("");
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionLoading ? "Обработка..." : "Одобрить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Отклонить заявку</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Причина отклонения <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Укажите причину, которую увидит учитель"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Заметки (опционально)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Внутренние заметки для администрации"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                  setAdminNotes("");
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? "Обработка..." : "Отклонить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
