"use client";

import React from "react";
import ModalShell from "@/components/teacher/ui/ModalShell";
import { Button } from "@/components/teacher/ui/Button";

export default function ConfirmModal({
  title,
  message,
  confirmText = "Подтвердить",
  danger = false,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <ModalShell
      title={title}
      subtitle={message}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button
            variant={danger ? "danger" : "primary"}
            className={danger ? "bg-red-600 hover:bg-red-700 text-white border-red-600" : ""}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
        </div>
      }
    >
      <div className="text-sm text-slate-700">Подтвердите действие.</div>
    </ModalShell>
  );
}

