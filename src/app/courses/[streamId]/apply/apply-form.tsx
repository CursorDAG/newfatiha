"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApplyForm({ streamId }: { streamId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/enrollment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId,
          message: message.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка при подаче заявки");
        setLoading(false);
        return;
      }

      router.push("/student/my-applications");
    } catch {
      setError("Произошла ошибка при подаче заявки");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-slate-200 pt-8">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Подать заявку</h3>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm">
          {error}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-bold text-slate-700 mb-2">
          Сообщение учителю (необязательно)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Расскажите о себе, своем опыте или задайте вопросы..."
          rows={4}
          maxLength={1000}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all resize-none"
        />
        <div className="text-xs text-slate-500 mt-1 text-right">
          {message.length} / 1000
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Отправка...</span>
          </>
        ) : (
          "Подать заявку"
        )}
      </button>

      <p className="text-xs text-slate-500 mt-4 text-center">
        После подачи заявки учитель рассмотрит её и свяжется с вами
      </p>
    </form>
  );
}
