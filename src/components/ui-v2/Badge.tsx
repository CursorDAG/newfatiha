"use client";

import React from "react";

/**
 * Badge Component - Design System v2
 *
 * Implements consistent badge styling with semantic colors.
 * Addresses UI/UX issue #23 (status badges inconsistent sizing).
 *
 * @example
 * <Badge variant="success">Active</Badge>
 * <Badge variant="error" icon={<XIcon />}>Failed</Badge>
 */

export type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral";
export type BadgeSize = "sm" | "md";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  className?: string;
}

export function Badge({
  children,
  variant = "neutral",
  size = "md",
  icon,
  className = "",
}: BadgeProps) {
  const baseStyles = [
    "inline-flex items-center justify-center gap-1.5",
    "font-semibold",
    "rounded-full",
    "border",
    "min-w-[4rem]",
  ].join(" ");

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-xs",
  };

  const variantStyles: Record<BadgeVariant, string> = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    error: "bg-red-50 text-red-700 border-red-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const combinedStyles = [
    baseStyles,
    sizeStyles[size],
    variantStyles[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={combinedStyles}>
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

/**
 * Status Badge Component
 *
 * Pre-configured badges for common status values with Russian labels.
 * Addresses UI/UX issue #23 (showing raw status values).
 */

export type StatusValue =
  | "ACTIVE"
  | "KICKED"
  | "TRANSFERRED"
  | "REPEATING"
  | "SUBMITTED"
  | "PASSED"
  | "FAILED"
  | "ACCEPTED"
  | "NEEDS_REWORK"
  | "REJECTED";

export interface StatusBadgeProps {
  status: StatusValue;
  size?: BadgeSize;
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const statusConfig: Record<
    StatusValue,
    { label: string; variant: BadgeVariant; icon?: string }
  > = {
    ACTIVE: { label: "Активен", variant: "success", icon: "✓" },
    KICKED: { label: "Исключён", variant: "error", icon: "✗" },
    TRANSFERRED: { label: "Переведён", variant: "info", icon: "→" },
    REPEATING: { label: "Повторяет", variant: "warning", icon: "↻" },
    SUBMITTED: { label: "На проверке", variant: "warning", icon: "⏳" },
    PASSED: { label: "Пройден", variant: "success", icon: "✓" },
    FAILED: { label: "Не пройден", variant: "error", icon: "✗" },
    ACCEPTED: { label: "Принято", variant: "success", icon: "✓" },
    NEEDS_REWORK: { label: "Доработать", variant: "warning", icon: "↻" },
    REJECTED: { label: "Отклонено", variant: "error", icon: "✗" },
  };

  const config = statusConfig[status] || {
    label: status,
    variant: "neutral" as BadgeVariant,
  };

  return (
    <Badge variant={config.variant} size={size}>
      {config.icon && <span>{config.icon}</span>}
      {config.label}
    </Badge>
  );
}
