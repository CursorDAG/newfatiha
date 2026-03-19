"use client";

import React, { useState } from "react";

/**
 * Tooltip positioning options
 */
type TooltipPosition = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  /** Content to display in the tooltip */
  content: React.ReactNode;
  /** Position of the tooltip relative to the trigger */
  position?: TooltipPosition;
  /** Element that triggers the tooltip */
  children: React.ReactNode;
  /** Additional CSS classes for the tooltip */
  className?: string;
}

/**
 * Tooltip component that displays contextual information on hover.
 * Automatically positions itself relative to the trigger element.
 *
 * @example
 * ```tsx
 * <Tooltip content="Это подсказка" position="top">
 *   <button>Наведите курсор</button>
 * </Tooltip>
 * ```
 */
export function Tooltip({
  content,
  position = "top",
  children,
  className = "",
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positions: Record<TooltipPosition, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrows: Record<TooltipPosition, string> = {
    top: "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-slate-900",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-slate-900",
    left: "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-slate-900",
    right: "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-slate-900",
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute ${positions[position]} z-50 animate-in fade-in duration-150`}
          role="tooltip"
        >
          <div
            className={`bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-xs ${className}`}
          >
            {content}
          </div>
          <div
            className={`absolute w-0 h-0 border-4 ${arrows[position]}`}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
