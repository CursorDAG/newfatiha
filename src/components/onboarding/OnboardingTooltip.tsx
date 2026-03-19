"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useOnboarding } from "@/contexts/OnboardingContext";

export function OnboardingTooltip() {
  const { isActive, currentStep, steps, completeStep, previousStep, skipOnboarding } = useOnboarding();
  const [tooltipPosition, setTooltipPosition] = useState<"top" | "bottom" | "left" | "right">("bottom");
  const [mounted, setMounted] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isActive || !mounted) return;

    const step = steps[currentStep];
    if (!step) return;

    const updatePosition = () => {
      const targetElement = document.querySelector(step.target);
      if (!targetElement) return;

      // Calculate tooltip position
      const preferredPosition = step.position || "bottom";
      setTooltipPosition(preferredPosition);

      // Scroll element into view
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [isActive, currentStep, steps, mounted]);

  if (!isActive || !mounted) return null;

  const step = steps[currentStep];
  if (!step) return null;

  const targetElement = document.querySelector(step.target);
  if (!targetElement) return null;

  const rect = targetElement.getBoundingClientRect();

  const getTooltipStyle = () => {
    const baseStyle = {
      position: "fixed" as const,
      zIndex: 10001,
    };

    const tooltipWidth = 320;
    const tooltipPadding = 16;

    switch (tooltipPosition) {
      case "top":
        return {
          ...baseStyle,
          left: rect.left + rect.width / 2 - tooltipWidth / 2,
          bottom: window.innerHeight - rect.top + tooltipPadding,
        };
      case "bottom":
        return {
          ...baseStyle,
          left: rect.left + rect.width / 2 - tooltipWidth / 2,
          top: rect.bottom + tooltipPadding,
        };
      case "left":
        return {
          ...baseStyle,
          right: window.innerWidth - rect.left + tooltipPadding,
          top: rect.top + rect.height / 2,
          transform: "translateY(-50%)",
        };
      case "right":
        return {
          ...baseStyle,
          left: rect.right + tooltipPadding,
          top: rect.top + rect.height / 2,
          transform: "translateY(-50%)",
        };
      default:
        return {
          ...baseStyle,
          left: rect.left + rect.width / 2 - tooltipWidth / 2,
          top: rect.bottom + tooltipPadding,
        };
    }
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity duration-300"
        style={{ zIndex: 9998 }}
        onClick={skipOnboarding}
      />

      {/* Spotlight */}
      <div
        className="fixed border-4 border-emerald-500 rounded-lg shadow-2xl transition-all duration-300 pointer-events-none"
        style={{
          zIndex: 9999,
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 20px rgba(16, 185, 129, 0.5)",
        }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="bg-white rounded-lg shadow-2xl p-6 w-80 animate-in fade-in slide-in-from-bottom-4 duration-300"
        style={getTooltipStyle()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-emerald-600">
            Шаг {currentStep + 1} из {steps.length}
          </span>
          <button
            onClick={skipOnboarding}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Закрыть"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <h3 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h3>
        <p className="text-slate-600 mb-6 text-sm leading-relaxed">{step.description}</p>

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={skipOnboarding}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Пропустить
          </button>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={previousStep}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Назад
              </button>
            )}
            <button
              onClick={completeStep}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
            >
              {currentStep === steps.length - 1 ? "Завершить" : "Далее"}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
