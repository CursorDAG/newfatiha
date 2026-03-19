"use client";

import React, { forwardRef } from "react";

/**
 * Input Component - Design System v2
 *
 * Implements WCAG AA compliant form input with proper validation feedback.
 * Addresses UI/UX issue #14 (form validation feedback).
 *
 * @example
 * <Input
 *   label="Email"
 *   type="email"
 *   required
 *   error="Please enter a valid email"
 *   helperText="We'll never share your email"
 * />
 */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      disabled,
      fullWidth = true,
      className = "",
      id,
      ...props
    },
    ref
  ) => {
    // Generate unique ID if not provided
    const inputId = id || `input-${React.useId()}`;

    // Base input styles
    const baseStyles = [
      "px-4 py-3",
      "text-base",
      "min-h-[48px]",
      "border-2",
      "rounded-lg",
      "transition-all duration-200",
      "focus:outline-none",
      "disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100",
    ].join(" ");

    // State-dependent styles
    const stateStyles = error
      ? [
          "border-red-500",
          "bg-red-50",
          "text-red-900",
          "placeholder:text-red-400",
          "focus:border-red-600",
          "focus:ring-4 focus:ring-red-100",
        ].join(" ")
      : [
          "border-slate-300",
          "bg-slate-50",
          "text-slate-900",
          "placeholder:text-slate-400",
          "hover:border-slate-400 hover:bg-white",
          "focus:border-emerald-500 focus:bg-white",
          "focus:ring-4 focus:ring-emerald-100",
        ].join(" ");

    // Width styles
    const widthStyles = fullWidth ? "w-full" : "";

    // Combine all styles
    const combinedStyles = [baseStyles, stateStyles, widthStyles, className]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={fullWidth ? "w-full" : ""}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-slate-700 mb-2"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Input */}
        <input
          ref={ref}
          id={inputId}
          className={combinedStyles}
          disabled={disabled}
          required={required}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={
            error
              ? `${inputId}-error`
              : helperText
                ? `${inputId}-helper`
                : undefined
          }
          {...props}
        />

        {/* Error message */}
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-2 text-xs text-red-600 flex items-center gap-1"
            role="alert"
          >
            <svg
              className="w-4 h-4 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}

        {/* Helper text */}
        {!error && helperText && (
          <p
            id={`${inputId}-helper`}
            className="mt-2 text-xs text-slate-500"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

/**
 * Textarea Component - Design System v2
 */

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      disabled,
      fullWidth = true,
      className = "",
      id,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaId = id || `textarea-${React.useId()}`;

    const baseStyles = [
      "px-4 py-3",
      "text-base",
      "border-2",
      "rounded-lg",
      "transition-all duration-200",
      "focus:outline-none",
      "resize-none",
      "disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100",
    ].join(" ");

    const stateStyles = error
      ? [
          "border-red-500",
          "bg-red-50",
          "text-red-900",
          "placeholder:text-red-400",
          "focus:border-red-600",
          "focus:ring-4 focus:ring-red-100",
        ].join(" ")
      : [
          "border-slate-300",
          "bg-slate-50",
          "text-slate-900",
          "placeholder:text-slate-400",
          "hover:border-slate-400 hover:bg-white",
          "focus:border-emerald-500 focus:bg-white",
          "focus:ring-4 focus:ring-emerald-100",
        ].join(" ");

    const widthStyles = fullWidth ? "w-full" : "";

    const combinedStyles = [baseStyles, stateStyles, widthStyles, className]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={fullWidth ? "w-full" : ""}>
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-semibold text-slate-700 mb-2"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          className={combinedStyles}
          disabled={disabled}
          required={required}
          rows={rows}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={
            error
              ? `${textareaId}-error`
              : helperText
                ? `${textareaId}-helper`
                : undefined
          }
          {...props}
        />

        {error && (
          <p
            id={`${textareaId}-error`}
            className="mt-2 text-xs text-red-600 flex items-center gap-1"
            role="alert"
          >
            <svg
              className="w-4 h-4 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={`${textareaId}-helper`} className="mt-2 text-xs text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
