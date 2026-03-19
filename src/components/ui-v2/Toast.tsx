"use client";

import React, { useEffect, useState } from "react";

/**
 * Toast Component - Design System v2
 *
 * Implements accessible toast notifications with auto-dismiss.
 * Addresses UI/UX issue #9 (toast notifications block content).
 *
 * @example
 * const { showToast } = useToast();
 * showToast({ type: "success", title: "Saved!", message: "Changes saved successfully" });
 */

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface ToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

export function ToastItem({ toast, onDismiss }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = toast.duration || 5000;
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  const typeConfig: Record<
    ToastType,
    { icon: string; borderColor: string; bgColor: string }
  > = {
    success: {
      icon: "✓",
      borderColor: "border-l-emerald-500",
      bgColor: "bg-emerald-50",
    },
    error: {
      icon: "✗",
      borderColor: "border-l-red-500",
      bgColor: "bg-red-50",
    },
    info: {
      icon: "ℹ",
      borderColor: "border-l-blue-500",
      bgColor: "bg-blue-50",
    },
    warning: {
      icon: "⚠",
      borderColor: "border-l-amber-500",
      bgColor: "bg-amber-50",
    },
  };

  const config = typeConfig[toast.type];

  return (
    <div
      className={`
        bg-white rounded-xl shadow-lg border-l-4 p-4 min-w-[20rem] max-w-md
        ${config.borderColor}
        ${isExiting ? "animate-slideOutRight" : "animate-slideInRight"}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span
            className={`
              shrink-0 w-6 h-6 rounded-full flex items-center justify-center
              text-sm font-bold ${config.bgColor}
            `}
          >
            {config.icon}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 text-sm">{toast.title}</p>
            {toast.message && (
              <p className="text-xs text-slate-600 mt-1">{toast.message}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            setIsExiting(true);
            setTimeout(() => onDismiss(toast.id), 300);
          }}
          className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors"
          aria-label="Dismiss notification"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * ToastContainer Component
 *
 * Container for all toast notifications. Position: bottom-right.
 */

export interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

/**
 * useToast Hook
 *
 * Hook for managing toast notifications.
 */

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (
    toast: Omit<Toast, "id"> & { id?: string }
  ) => {
    const id = toast.id || `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    toasts,
    showToast,
    dismissToast,
    ToastContainer: () => (
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    ),
  };
}
