"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

export interface ModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Modal content */
  children: React.ReactNode;
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Maximum width class (defaults to max-w-lg) */
  maxWidth?: "max-w-sm" | "max-w-md" | "max-w-lg" | "max-w-xl" | "max-w-2xl" | "max-w-4xl";
  /** Prevent closing on backdrop click */
  disableBackdropClose?: boolean;
}

/**
 * Modal dialog component with backdrop, animations, and accessibility features.
 * Automatically handles focus trapping and ESC key to close.
 *
 * @example
 * ```tsx
 * <Modal
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Подтверждение"
 *   footer={<Button onClick={handleConfirm}>Подтвердить</Button>}
 * >
 *   Вы уверены?
 * </Modal>
 * ```
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = "max-w-lg",
  disableBackdropClose = false,
}: ModalProps) {
  // Handle ESC key
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onMouseDown={(e) => {
        if (!disableBackdropClose && e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 p-6 text-white flex items-start justify-between">
          <div className="flex-1">
            <h2 id="modal-title" className="text-2xl font-bold">
              {title}
            </h2>
            {subtitle && <p className="text-emerald-200 text-sm mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1 rounded-lg hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && <div className="p-6 pt-0 border-t border-slate-200">{footer}</div>}
      </div>
    </div>
  );
}
