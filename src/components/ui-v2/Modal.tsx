"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

/**
 * Modal Component - Design System v2
 *
 * Implements accessible modal with proper backdrop and scroll locking.
 * Addresses UI/UX issues #5 (modal overflow), #13 (backdrop scroll).
 *
 * @example
 * <Modal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Confirm Action"
 *   subtitle="This action cannot be undone"
 * >
 *   <p>Are you sure you want to continue?</p>
 *   <ModalFooter>
 *     <Button variant="secondary" onClick={onClose}>Cancel</Button>
 *     <Button variant="danger" onClick={onConfirm}>Delete</Button>
 *   </ModalFooter>
 * </Modal>
 */

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnBackdropClick?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = "md",
  closeOnBackdropClick = true,
}: ModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${sizeStyles[size]} max-h-[90vh] overflow-y-auto animate-slideUp`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 id="modal-title" className="text-2xl font-bold">
                {title}
              </h2>
              {subtitle && (
                <p className="text-emerald-200 text-sm mt-1">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/**
 * ModalFooter Component
 *
 * Provides consistent footer styling for modal actions.
 */

export interface ModalFooterProps {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
}

export function ModalFooter({ children, align = "right" }: ModalFooterProps) {
  const alignStyles = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  };

  return (
    <div className={`flex flex-wrap items-center gap-3 mt-6 ${alignStyles[align]}`}>
      {children}
    </div>
  );
}
