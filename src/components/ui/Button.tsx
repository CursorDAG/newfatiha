"use client";

import React from "react";
import { Loader2 } from "lucide-react";

/**
 * Button variants for different visual styles
 */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";

/**
 * Button sizes
 */
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Show loading spinner and disable interaction */
  loading?: boolean;
  /** Icon to display before the button text */
  icon?: React.ReactNode;
  /** Icon to display after the button text */
  iconRight?: React.ReactNode;
}

/**
 * Reusable button component with multiple variants and sizes.
 * Supports loading states, icons, and full accessibility.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Сохранить
 * </Button>
 * ```
 */
export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  icon,
  iconRight,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2";

  const sizes: Record<ButtonSize, string> = {
    sm: "px-3 py-2 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const variants: Record<ButtonVariant, string> = {
    primary: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm focus:ring-emerald-500",
    secondary: "bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 shadow-sm focus:ring-slate-500",
    danger: "bg-white border border-red-200 text-red-600 hover:bg-red-50 shadow-sm focus:ring-red-500",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-700 focus:ring-slate-500",
    success: "bg-emerald-100 border border-emerald-300 text-emerald-700 hover:bg-emerald-200 focus:ring-emerald-500",
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      ) : (
        icon && <span aria-hidden="true">{icon}</span>
      )}
      {children}
      {!loading && iconRight && <span aria-hidden="true">{iconRight}</span>}
    </button>
  );
}
