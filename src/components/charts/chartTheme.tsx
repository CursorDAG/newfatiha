"use client";

/**
 * Shared building blocks for the dark/gold progress charts.
 * Keeps tooltip + axis styling consistent across ProgressChart,
 * LessonProgressChart and HasanatChart.
 */
import React from "react";

export const GOLD = "#D4AF37";
export const GOLD_SOFT = "#E8C766";
export const GRID = "rgba(212, 175, 55, 0.12)";
export const AXIS = "rgba(255, 255, 255, 0.45)";

/** Format an ISO YYYY-MM-DD key to a short Russian "5 фев" style label. */
export function formatDayLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

type TooltipRow = { label: string; value: string | number };

export function ChartTooltip({
  active,
  title,
  rows,
}: {
  active?: boolean;
  title?: string;
  rows: TooltipRow[];
}) {
  if (!active) return null;
  return (
    <div className="rounded-xl border border-[#D4AF37]/30 bg-[#06201A]/95 px-3 py-2 shadow-xl backdrop-blur">
      {title && <p className="text-xs font-semibold text-[#D4AF37] mb-1">{title}</p>}
      {rows.map((r) => (
        <p key={r.label} className="text-xs text-white/80 whitespace-nowrap">
          {r.label}: <span className="font-bold text-white">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

/** Card wrapper with the dark-gold theme used across the progress charts. */
export function ChartCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#06201A]/40 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white">{title}</h3>
          {subtitle && <p className="text-xs sm:text-sm text-white/50 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function ChartState({ kind, message }: { kind: "loading" | "error" | "empty"; message: string }) {
  return (
    <div className="flex items-center justify-center h-[260px] text-center">
      <div>
        {kind === "loading" && (
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF37] mx-auto mb-3" />
        )}
        <p className={kind === "error" ? "text-red-300" : "text-white/50"}>{message}</p>
      </div>
    </div>
  );
}
