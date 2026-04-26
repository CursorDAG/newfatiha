"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Download } from "lucide-react";

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
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Заявки учителей</h1>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">Рассмотрение заявок на должность учителя</p>
          </div>

          <a
            href="/api/admin/export?type=applications"
            download
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Экспорт в CSV
          </a>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm mb-6">
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all duration-200"
                  >
                    {/* Заголовок карточки */}
                    <div className="p-6 border-b border-slate-100">
                      <div className="flex items-start gap-4">
                        {/* Аватар */}
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                          {app.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0">
                              <h3 className="text-lg font-bold text-slate-900 truncate">{app.name}</h3>
                              <p className="text-sm text-slate-600 truncate">{app.email}</p>
                            </div>
                            <span
                              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${
                                app.status === "ACTIVE"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : app.status === "REJECTED"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {app.status === "ACTIVE"
                                ? "✓ Одобрено"
                                : app.status === "REJECTED"
                                ? "✗ Отклонено"
                                : "⏳ На рассмотрении"}
                            </span>
                          </div>

                          {app.emailVerifiedAt && (
                            <div className="flex items-center gap-1 text-xs text-emerald-600">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Email подтверждён
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {app.profile && (
                      <>
                        {/* Информация */}
                        <div className="p-6 space-y-4">
                          {/* Предметы */}
                          <div>
                            <div className="text-xs font-medium text-slate-500 uppercase mb-2">Предметы</div>
                            <div className="flex flex-wrap gap-2">
                              {app.profile.subjects.map((subject, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                                >
                                  {subject}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Опыт */}
                          <div>
                            <div className="text-xs font-medium text-slate-500 uppercase mb-2">Опыт работы</div>
                            <p className="text-sm text-slate-700 line-clamp-2">{app.profile.experience}</p>
                          </div>

                          {/* Контакты */}
                          <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                            <button
                              onClick={() => openWhatsApp(app.profile!.whatsappPhone)}
                              className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                              WhatsApp
                            </button>

                            <button
                              onClick={() => setSelectedApp(app)}
                              className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                            >
                              Подробнее
                            </button>
                          </div>
                        </div>

                        {/* Действия для pending */}
                        {app.status === "PENDING_VERIFICATION" && (
                          <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button
                              onClick={() => {
                                setSelectedApp(app);
                                setShowApproveModal(true);
                              }}
                              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                            >
                              ✓ Одобрить
                            </button>
                            <button
                              onClick={() => {
                                setSelectedApp(app);
                                setShowRejectModal(true);
                              }}
                              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                              ✗ Отклонить
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
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
    </>
  );
}
