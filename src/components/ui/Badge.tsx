"use client";

import React from "react";

/**
 * Badge color variants for different statuses
 */
type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral";

/**
 * Badge sizes
 */
type BadgeSize = "sm" | "md" | "lg";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Color variant for different statuses */
  variant?: BadgeVariant;
  /** Size of the badge */
  size?: BadgeSize;
  /** Icon to display before the badge text */
  icon?: React.ReactNode;
}

/**
 * Badge component for displaying status indicators and labels.
 * Supports multiple color variants, sizes, and optional icons.
 *
 * @example
 * ```tsx
 * <Badge variant="success" size="md">Активен</Badge>
 * <Badge variant="error" icon={<AlertCircle />}>Ошибка</Badge>
 * ```
 */
export function Badge({
  variant = "neutral",
  size = "md",
  icon,
  className = "",
  children,
  ...props
}: BadgeProps) {
  const base = "inline-flex items-center gap-1.5 rounded-full font-bold border";

  const sizes: Record<BadgeSize, string> = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-xs",
    lg: "px-4 py-1.5 text-sm",
  };

  const variants: Record<BadgeVariant, string> = {
    success: "bg-emerald-100 text-emerald-800 border-emerald-200",
    warning: "bg-amber-100 text-amber-800 border-amber-200",
    error: "bg-red-100 text-red-800 border-red-200",
    info: "bg-blue-100 text-blue-800 border-blue-200",
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}
