"use client";

import React from "react";

export default function ModalShell({
  title,
  subtitle,
  children,
  onClose,
  footer,
  maxWidthClass = "max-w-lg",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  /** Tailwind max-width class applied to the dialog panel. Defaults to "max-w-lg". */
  maxWidthClass?: string;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidthClass} overflow-hidden`}>
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 p-6 text-white">
          <h2 className="text-2xl font-bold">{title}</h2>
          {subtitle && <p className="text-emerald-200 text-sm mt-1">{subtitle}</p>}
        </div>
        <div className="p-6 space-y-4">{children}</div>
        <div className="p-6 pt-0">{footer}</div>
      </div>
    </div>
  );
}

