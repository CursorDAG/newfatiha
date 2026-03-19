"use client";

import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional header content */
  header?: React.ReactNode;
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Enable hover effect */
  hoverable?: boolean;
  /** Custom padding (defaults to p-6) */
  padding?: string;
}

/**
 * Card container component with optional header and footer sections.
 * Provides consistent styling with shadows and hover effects.
 *
 * @example
 * ```tsx
 * <Card header={<h3>Заголовок</h3>} footer={<Button>Действие</Button>}>
 *   Содержимое карточки
 * </Card>
 * ```
 */
export function Card({
  header,
  footer,
  hoverable = false,
  padding = "p-6",
  className = "",
  children,
  ...props
}: CardProps) {
  const base = "bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden";
  const hoverEffect = hoverable ? "transition-shadow hover:shadow-md" : "";

  return (
    <div className={`${base} ${hoverEffect} ${className}`} {...props}>
      {header && (
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          {header}
        </div>
      )}
      <div className={padding}>{children}</div>
      {footer && (
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          {footer}
        </div>
      )}
    </div>
  );
}
