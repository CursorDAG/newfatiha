"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Send, Clock, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

type Broadcast = {
  id: string;
  title: string;
  message: string;
  priority: string;
  createdAt: string;
  metadata: Record<string, unknown>;
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

  const fetchBroadcasts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/broadcasts");
      if (!res.ok) throw new Error("Failed to fetch broadcasts");
      const data = await res.json();
      setBroadcasts(data.broadcasts);
    } catch {
      showToast("Ошибка загрузки истории рассылок", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBroadcasts();
  }, [fetchBroadcasts]);

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
    } catch {
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
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Массовые рассылки</h1>
            <p className="text-emerald-200/70 mt-1 text-sm sm:text-base">Отправка уведомлений пользователям платформы</p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-[#06201A] bg-gradient-to-r from-[#D4AF37] to-[#C49A2B] rounded-lg hover:from-[#E8D48B] hover:to-[#D4AF37] transition-all shrink-0 shadow-lg shadow-amber-500/20"
          >
            <Send className="w-4 h-4" />
            Создать рассылку
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-[#0A2820] rounded-xl shadow-sm border border-emerald-800/30 p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-6">Новая рассылка</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-emerald-200 mb-2">
                  Заголовок <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Важное объявление"
                  className="w-full px-4 py-2 bg-[#0D3329] border border-emerald-700/50 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] text-white placeholder-emerald-300/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-emerald-200 mb-2">
                  Сообщение <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Текст объявления..."
                  rows={5}
                  className="w-full px-4 py-2 bg-[#0D3329] border border-emerald-700/50 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] text-white placeholder-emerald-300/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-emerald-200 mb-2">Кому отправить</label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as TargetAudienceType })}
                    className="w-full px-4 py-2 bg-[#0D3329] border border-emerald-700/50 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] text-white"
                  >
                    <option value="ALL">Всем пользователям</option>
                    <option value="STUDENTS">Только студентам</option>
                    <option value="TEACHERS">Только учителям</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-emerald-200 mb-2">Приоритет</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0D3329] border border-emerald-700/50 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] text-white"
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
                  className="w-4 h-4 text-[#D4AF37] border-emerald-700/50 rounded focus:ring-[#D4AF37] bg-[#0D3329]"
                />
                <label htmlFor="sendEmail" className="text-sm text-emerald-200">
                  Отправить также на email (если настроено)
                </label>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={sendBroadcast}
                  disabled={sending}
                  className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-[#06201A] bg-gradient-to-r from-[#D4AF37] to-[#C49A2B] rounded-lg hover:from-[#E8D48B] hover:to-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/20"
                >
                  <Send className="w-4 h-4" />
                  {sending ? "Отправка..." : "Отправить"}
                </button>

                <button
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 text-sm font-medium text-emerald-200 bg-emerald-800/30 border border-emerald-700/50 rounded-lg hover:bg-emerald-800/50 transition-colors"
                >
                  Отменить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        <div className="bg-[#0A2820] rounded-xl shadow-sm border border-emerald-800/30">
          <div className="p-6 border-b border-emerald-800/30">
            <h2 className="text-xl font-bold text-white">История рассылок</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <p className="text-emerald-200/70">Загрузка...</p>
            </div>
          ) : broadcasts.length === 0 ? (
            <EmptyState
              icon={<Send className="w-16 h-16" />}
              title="Рассылок пока нет"
              description="История массовых рассылок пуста. Создайте первую рассылку, чтобы отправить уведомления пользователям платформы."
              action={{
                label: "Создать рассылку",
                onClick: () => setShowForm(true)
              }}
            />
          ) : (
            <div className="divide-y divide-emerald-800/30">
              {broadcasts.map((broadcast) => (
                <div key={broadcast.id} className="p-6 hover:bg-emerald-900/20 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">{broadcast.title}</h3>
                      <p className="text-emerald-200/70 text-sm">{broadcast.message}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getPriorityBadge(broadcast.priority)}`}>
                      {broadcast.priority}
                    </span>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-emerald-300/70">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {new Date(broadcast.createdAt).toLocaleString("ru-RU")}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {getTargetAudienceLabel((broadcast.metadata?.targetAudience as string) || "ALL")}
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
              toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </>
  );
}
