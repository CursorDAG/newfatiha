"use client";

import React, { forwardRef } from "react";
import { AlertCircle } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Label text displayed above the input */
  label?: string;
  /** Error message displayed below the input */
  error?: string;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Icon to display before the input */
  icon?: React.ReactNode;
  /** Icon to display after the input */
  iconRight?: React.ReactNode;
  /** Full width input */
  fullWidth?: boolean;
}

/**
 * Input component with label, error handling, and icon support.
 * Provides consistent styling and validation states.
 *
 * @example
 * ```tsx
 * <Input
 *   label="Email"
 *   type="email"
 *   placeholder="example@fatiha.ru"
 *   error={errors.email}
 *   helperText="Введите ваш email"
 * />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      icon,
      iconRight,
      fullWidth = false,
      className = "",
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const hasError = !!error;

    const inputClasses = `
      w-full px-4 py-2.5 rounded-xl border transition-colors
      text-slate-900 placeholder:text-slate-400
      focus:outline-none focus:ring-2 focus:ring-offset-1
      disabled:opacity-50 disabled:cursor-not-allowed
      ${icon ? "pl-11" : ""}
      ${iconRight ? "pr-11" : ""}
      ${
        hasError
          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
          : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
      }
      ${className}
    `;

    return (
      <div className={fullWidth ? "w-full" : ""}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-bold text-slate-700 mb-2"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={inputClasses}
            aria-invalid={hasError}
            aria-describedby={
              error
                ? `${inputId}-error`
                : helperText
                ? `${inputId}-helper`
                : undefined
            }
            {...props}
          />
          {iconRight && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
              {iconRight}
            </div>
          )}
        </div>
        {error && (
          <div
            id={`${inputId}-error`}
            className="mt-2 flex items-center gap-1.5 text-sm text-red-600"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {!error && helperText && (
          <div
            id={`${inputId}-helper`}
            className="mt-2 text-sm text-slate-600"
          >
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
