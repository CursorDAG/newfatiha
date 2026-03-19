"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Send, Clock, Users, CheckCircle } from "lucide-react";

type Broadcast = {
  id: string;
  title: string;
  message: string;
  priority: string;
  createdAt: string;
  metadata: any;
};

type TargetAudienceType = "ALL" | "STUDENTS" | "TEACHERS" | "SPECIFIC";

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    message: "",
    targetAudience: "ALL" as TargetAudienceType,
    priority: "NORMAL",
    sendEmail: false,
  });

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const fetchBroadcasts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/broadcasts");
      if (!res.ok) throw new Error("Failed to fetch broadcasts");
      const data = await res.json();
      setBroadcasts(data.broadcasts);
    } catch (error) {
      showToast("Ошибка загрузки истории рассылок", "error");
    } finally {
      setLoading(false);
    }
  };

  const sendBroadcast = async () => {
    if (!formData.title || !formData.message) {
      showToast("Заполните все обязательные поля", "error");
      return;
    }

    if (!confirm(`Отправить рассылку "${formData.title}"?`)) {
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          message: formData.message,
          targetAudience: { type: formData.targetAudience },
          priority: formData.priority,
          sendEmail: formData.sendEmail,
        }),
      });

      if (!res.ok) throw new Error("Failed to send broadcast");

      const data = await res.json();
      showToast(`Рассылка отправлена ${data.recipientCount} получателям`, "success");

      setFormData({
        title: "",
        message: "",
        targetAudience: "ALL",
        priority: "NORMAL",
        sendEmail: false,
      });
      setShowForm(false);
      fetchBroadcasts();
    } catch (error) {
      showToast("Ошибка отправки рассылки", "error");
    } finally {
      setSending(false);
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      LOW: "bg-slate-100 text-slate-700",
      NORMAL: "bg-blue-100 text-blue-700",
      HIGH: "bg-orange-100 text-orange-700",
      URGENT: "bg-red-100 text-red-700",
    };
    return colors[priority as keyof typeof colors] || colors.NORMAL;
  };

  const getTargetAudienceLabel = (type: string) => {
    const labels = {
      ALL: "Всем пользователям",
      STUDENTS: "Только студентам",
      TEACHERS: "Только учителям",
      SPECIFIC: "Конкретным пользователям",
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Массовые рассылки</h1>
            <p className="text-slate-600 mt-1">Отправка уведомлений пользователям платформы</p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors"
          >
            <Send className="w-4 h-4" />
            Создать рассылку
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Новая рассылка</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Заголовок <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Важное объявление"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Сообщение <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Текст объявления..."
                  rows={5}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Кому отправить</label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as TargetAudienceType })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="ALL">Всем пользователям</option>
                    <option value="STUDENTS">Только студентам</option>
                    <option value="TEACHERS">Только учителям</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Приоритет</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="LOW">Низкий</option>
                    <option value="NORMAL">Обычный</option>
                    <option value="HIGH">Высокий</option>
                    <option value="URGENT">Срочный</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={formData.sendEmail}
                  onChange={(e) => setFormData({ ...formData, sendEmail: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                />
                <label htmlFor="sendEmail" className="text-sm text-slate-700">
                  Отправить также на email (если настроено)
                </label>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={sendBroadcast}
                  disabled={sending}
                  className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {sending ? "Отправка..." : "Отправить"}
                </button>

                <button
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Отменить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">История рассылок</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <p className="text-slate-600">Загрузка...</p>
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="p-8 text-center">
              <Send className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">Рассылок пока нет</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {broadcasts.map((broadcast) => (
                <div key={broadcast.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-1">{broadcast.title}</h3>
                      <p className="text-slate-600 text-sm">{broadcast.message}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getPriorityBadge(broadcast.priority)}`}>
                      {broadcast.priority}
                    </span>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {new Date(broadcast.createdAt).toLocaleString("ru-RU")}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {getTargetAudienceLabel(broadcast.metadata?.targetAudience || "ALL")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`px-6 py-4 rounded-lg shadow-lg ${
              toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
