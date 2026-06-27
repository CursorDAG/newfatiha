"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { ChevronsLeft, ChevronsRight, ChevronUp, ChevronDown, X } from "lucide-react";

/* ─── helpers ─────────────────────────────────────────── */

function clamp(val: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, val));
}

function useRect(selector: string | null) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!selector) return;
    const el = document.querySelector(selector);
    if (!el) return;
    setRect(el.getBoundingClientRect());

    const ro = new ResizeObserver(() => setRect(el.getBoundingClientRect()));
    ro.observe(document.body);
    window.addEventListener("scroll", () => setRect(el.getBoundingClientRect()), true);
    window.addEventListener("resize", () => setRect(el.getBoundingClientRect()));
    return () => { ro.disconnect(); };
  }, [selector]);

  return rect;
}

/* ─── component ───────────────────────────────────────── */

export function OnboardingTour() {
  const { isActive, currentStep, steps, completeStep, previousStep, skipOnboarding } = useOnboarding();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const step = steps[currentStep] ?? null;
  const targetRect = useRect(step?.target ?? null);

  // mount animation
  useEffect(() => {
    if (!isActive) return;
    setMounted(true);
    const id = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(id);
  }, [isActive, currentStep]);

  // hide when deactivated
  useEffect(() => {
    if (!isActive) setVisible(false);
  }, [isActive]);

  // scroll target into view
  useEffect(() => {
    if (!targetRect || !visible) return;
    step?.target && document.querySelector(step.target)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentStep, visible, step?.target, targetRect]);

  if (!isActive || !mounted) return null;

  /* ---- compute tooltip coords ---- */

  const TW = 300; // target tooltip width
  const GAP = 14;

  function position(): { style: React.CSSProperties; arrow: string } {
    if (!targetRect) return { style: {}, arrow: "" };

    const pos = step?.position ?? "right";
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 12;

    switch (pos) {
      case "top": {
        const x = clamp(targetRect.left + targetRect.width / 2 - TW / 2, pad, vw - TW - pad);
        return {
          style: { left: x, top: targetRect.top - 12 - GAP },
          arrow: "bottom",
        };
      }
      case "bottom": {
        const x = clamp(targetRect.left + targetRect.width / 2 - TW / 2, pad, vw - TW - pad);
        return {
          style: { left: x, top: targetRect.bottom + GAP },
          arrow: "top",
        };
      }
      case "left": {
        const y = clamp(targetRect.top + targetRect.height / 2 - 120, pad, vh - 240);
        return {
          style: { left: targetRect.left - 12 - TW, top: y, transform: "translateY(-50%)" },
          arrow: "right",
        };
      }
      case "right":
      default: {
        const y = clamp(targetRect.top + targetRect.height / 2 - 120, pad, vh - 240);
        return {
          style: { left: targetRect.right + GAP, top: y, transform: "translateY(-50%)" },
          arrow: "left",
        };
      }
    }
  }

  const { style, arrow } = position();

  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  /* ---- arrow icon ---- */

  const Arrow = {
    top: ChevronDown,
    bottom: ChevronUp,
    left: ChevronsRight,
    right: ChevronsLeft,
  }[arrow] ?? ChevronsLeft;

  /* ---- portal render ---- */

  return createPortal(
    <>
      {/* dimmed overlay */}
      <div
        className="fixed inset-0 transition-opacity duration-300"
        style={{
          background: "rgba(0,0,0,0.45)",
          zIndex: 9998,
          opacity: visible ? 1 : 0,
        }}
        onClick={skipOnboarding}
      />

      {/* spotlight on target */}
      {targetRect && (
        <div
          className="pointer-events-none fixed rounded-2xl transition-opacity duration-300"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            zIndex: 9999,
            border: "3px solid #D4AF37",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.4), 0 0 24px rgba(212,175,55,0.25), inset 0 0 12px rgba(212,175,55,0.15)",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.3s, box-shadow 0.3s, border-color 0.3s",
          }}
        />
      )}

      {/* tooltip card */}
      <div
        ref={tooltipRef}
        className="fixed glass-card rounded-3xl p-5 w-[300px] transition-all duration-300"
        style={{
          ...style,
          zIndex: 10000,
          opacity: visible ? 1 : 0,
          borderColor: "#D4AF37",
          borderWidth: "2px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.35), 0 0 28px rgba(212,175,55,0.12)",
          transform: visible ? undefined : "scale(0.95)",
          transformOrigin: arrow === "left" ? "left center" : arrow === "right" ? "right center" : arrow === "top" ? "bottom center" : "top center",
        }}
      >
        {/* step indicator */}
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#D4AF37]">
            <span className="w-6 h-6 rounded-full bg-[#D4AF37]/15 flex items-center justify-center text-[11px] font-bold text-[#D4AF37]">
              {currentStep + 1}
            </span>
            {steps.length} шагов
          </span>
          <button
            onClick={skipOnboarding}
            className="text-white/30 hover:text-white/70 transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* content */}
        <h3 className="text-base font-bold text-white mb-1.5 leading-snug">{step?.title}</h3>
        <p className="text-sm text-white/60 leading-relaxed mb-5">{step?.description}</p>

        {/* buttons */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={skipOnboarding}
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            Пропустить
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={previousStep}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.08] text-white/70 hover:bg-white/[0.14] transition-colors"
              >
                Назад
              </button>
            )}
            <button
              onClick={completeStep}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#D4AF37] text-[#06201A] hover:bg-[#E8D48B] transition-colors"
            >
              {isLast ? "Отлично!" : isFirst ? "Начать" : "Далее"}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
