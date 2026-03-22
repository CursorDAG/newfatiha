"use client";

import React from "react";
import { Loader2 } from "lucide-react";

/**
 * Button Component - Design System v2
 *
 * Implements WCAG AA compliant button with proper touch targets (44px minimum).
 * Addresses UI/UX issues #3 (button sizes) and #8 (action hierarchy).
 *
 * @example
 * <Button variant="primary" size="md">Save Changes</Button>
 * <Button variant="danger" size="sm" onClick={handleDelete}>Delete</Button>
 */

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  // Base styles - always applied
  const baseStyles = [
    "inline-flex items-center justify-center",
    "font-semibold",
    "rounded-lg",
    "border-2",
    "transition-all duration-200",
    "focus:outline-none focus:ring-4 focus:ring-offset-2",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
  ].join(" ");

  // Size styles - ensures minimum 44px touch target
  const sizeStyles: Record<ButtonSize, string> = {
    sm: "px-4 py-2.5 text-sm min-h-[44px]",  // 44px height
    md: "px-6 py-3 text-base min-h-[48px]",  // 48px height
    lg: "px-8 py-4 text-base min-h-[56px]",  // 56px height
  };

  // Variant styles
  const variantStyles: Record<ButtonVariant, string> = {
    primary: [
      "bg-emerald-600 text-white border-transparent",
      "hover:bg-emerald-700 hover:shadow-md hover:-translate-y-0.5",
      "active:bg-emerald-800 active:translate-y-0",
      "focus:ring-emerald-200",
    ].join(" "),

    secondary: [
      "bg-white text-slate-700 border-slate-300",
      "hover:bg-slate-50 hover:border-slate-400 hover:shadow-sm",
      "active:bg-slate-100",
      "focus:ring-slate-200",
    ].join(" "),

    danger: [
      "bg-red-600 text-white border-transparent",
      "hover:bg-red-700 hover:shadow-md hover:-translate-y-0.5",
      "active:bg-red-800 active:translate-y-0",
      "focus:ring-red-200",
    ].join(" "),

    ghost: [
      "bg-transparent text-slate-700 border-transparent",
      "hover:bg-slate-100",
      "active:bg-slate-200",
      "focus:ring-slate-200",
    ].join(" "),
  };

  // Width styles
  const widthStyles = fullWidth ? "w-full" : "";

  // Combine all styles
  const combinedStyles = [
    baseStyles,
    sizeStyles[size],
    variantStyles[variant],
    widthStyles,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={combinedStyles}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />}
      {children}
    </button>
  );
}

/**
 * Button Group Component
 *
 * Groups buttons with proper spacing (8px minimum between touch targets).
 *
 * @example
 * <ButtonGroup>
 *   <Button variant="secondary">Cancel</Button>
 *   <Button variant="primary">Save</Button>
 * </ButtonGroup>
 */

export interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}

export function ButtonGroup({
  children,
  className = "",
  align = "left",
}: ButtonGroupProps) {
  const alignStyles = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-3 ${alignStyles[align]} ${className}`}
    >
      {children}
    </div>
  );
}
