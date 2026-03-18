"use client";

import React from "react";

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-52 text-slate-400 border border-dashed border-slate-300 rounded-2xl bg-slate-50 p-6 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <p className="text-lg font-medium text-slate-600">{title}</p>
      {description && <p className="text-sm mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

