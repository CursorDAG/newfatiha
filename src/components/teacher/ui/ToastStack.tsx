"use client";

import React from "react";

export type ToastItem = {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message?: string;
};

export default function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-4 right-4 z-[60] w-full max-w-sm space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-2xl shadow-lg border p-4 bg-white ${
            t.type === "success"
              ? "border-emerald-200"
              : t.type === "error"
                ? "border-red-200"
                : "border-slate-200"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-extrabold text-slate-800 text-sm">
                {t.type === "success" ? "✅ " : t.type === "error" ? "⛔ " : "ℹ️ "}
                {t.title}
              </p>
              {t.message && <p className="text-xs text-slate-600 mt-1">{t.message}</p>}
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              className="text-slate-400 hover:text-slate-700 font-bold"
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

