"use client";

import { useState } from "react";
import { Send, Users, Mail, CheckCircle, XCircle, Loader2 } from "lucide-react";

type RecipientType = "all" | "students" | "teachers" | "admins" | "custom";

export default function AdminMailPage() {
  const [to, setTo] = useState<RecipientType>("all");
  const [customEmails, setCustomEmails] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isHtml, setIsHtml] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    results?: {
      total: number;
      sent: number;
      failed: number;
      errors: string[];
    };
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult(null);

    try {
      const body: {
        to: string;
        subject?: string;
        text?: string;
        html?: string;
        message?: string;
        customEmails?: string[];
      } = {
        to,
        subject,
        message,
        isHtml,
      };

      if (to === "custom") {
        body.customEmails = customEmails
          .split(/[,\n]/)
          .map((e) => e.trim())
          .filter((e) => e);
      }

      const res = await fetch("/api/admin/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ошибка отправки");
      }

      setResult(data);

      // Очистить форму при успехе
      if (data.success && data.results.failed === 0) {
        setSubject("");
        setMessage("");
        setCustomEmails("");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ошибка отправки");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Mail className="w-6 h-6" />
          Отправка писем
        </h1>
        <p className="text-slate-600 mt-1">
          Отправка писем от admin@fatiha.ru
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Получатели */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Получатели
          </label>

          <div className="space-y-2">
            {[
              { value: "all", label: "Все пользователи", icon: Users },
              { value: "students", label: "Только студенты", icon: Users },
              { value: "teachers", label: "Только учителя", icon: Users },
              { value: "admins", label: "Только администраторы", icon: Users },
              { value: "custom", label: "Указать вручную", icon: Mail },
            ].map(({ value, label, icon: Icon }) => (
              <label
                key={value}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <input
                  type="radio"
                  name="to"
                  value={value}
                  checked={to === value}
                  onChange={(e) => setTo(e.target.value as RecipientType)}
                  className="w-4 h-4 text-emerald-600"
                />
                <Icon className="w-5 h-5 text-slate-400" />
                <span className="text-slate-700">{label}</span>
              </label>
            ))}
          </div>

          {to === "custom" && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email адреса (через запятую или с новой строки)
              </label>
              <textarea
                value={customEmails}
                onChange={(e) => setCustomEmails(e.target.value)}
                placeholder="user1@example.com, user2@example.com"
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required={to === "custom"}
              />
            </div>
          )}
        </div>

        {/* Тема */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Тема письма
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Введите тему письма"
            maxLength={200}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Сообщение */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Текст письма
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Введите текст письма"
            rows={12}
            maxLength={50000}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono text-sm"
          />

          <label className="flex items-center gap-2 mt-3 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={isHtml}
              onChange={(e) => setIsHtml(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            Отправить как HTML
          </label>
        </div>

        {/* Результат */}
        {result && (
          <div
            className={`rounded-lg border p-4 ${
              result.results && result.results.failed === 0
                ? "bg-emerald-50 border-emerald-200"
                : "bg-amber-50 border-amber-200"
            }`}
          >
            <div className="flex items-start gap-3">
              {result.results && result.results.failed === 0 ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium text-slate-900">
                  {result.results && result.results.failed === 0
                    ? "Письма успешно отправлены"
                    : "Отправка завершена с ошибками"}
                </p>
                {result.results && (
                  <div className="mt-2 text-sm text-slate-600 space-y-1">
                    <p>Всего: {result.results.total}</p>
                    <p className="text-emerald-600">Отправлено: {result.results.sent}</p>
                    {result.results.failed > 0 && (
                      <>
                        <p className="text-red-600">Ошибок: {result.results.failed}</p>
                        {result.results.errors.length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-slate-700 font-medium">
                              Показать ошибки
                            </summary>
                            <ul className="mt-2 space-y-1 text-xs text-red-600">
                              {result.results.errors.map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Кнопка отправки */}
        <button
          type="submit"
          disabled={sending}
          className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {sending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Отправка...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Отправить письма
            </>
          )}
        </button>
      </form>
    </div>
  );
}
