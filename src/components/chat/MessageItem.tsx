"use client";

import React from "react";

interface Sender {
  id: string;
  name: string;
  avatar?: string | null;
  role: string;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: Sender;
  createdAt: Date | string;
  isEdited: boolean;
  editedAt?: Date | string | null;
  isDeleted: boolean;
}

interface MessageItemProps {
  message: Message;
  currentUserId: string;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  canDelete?: boolean;
}

export function MessageItem({
  message,
  currentUserId,
  onEdit,
  onDelete,
  canDelete = false,
}: MessageItemProps) {
  const [imageError, setImageError] = React.useState(false);
  const isOwn = message.senderId === currentUserId;
  const createdAt = new Date(message.createdAt);
  const timeStr = createdAt.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (message.isDeleted) {
    return (
      <div className="py-2 px-4 text-slate-400 italic text-sm">
        Сообщение удалено
      </div>
    );
  }

  return (
    <div
      className={`flex gap-3 py-2 px-4 hover:bg-slate-50 ${
        isOwn ? "flex-row-reverse" : ""
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {message.sender.avatar && !imageError ? (
          <img
            src={message.sender.avatar}
            alt={message.sender.name}
            className="w-8 h-8 rounded-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-medium">
            {message.sender.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Message content */}
      <div className={`flex-1 min-w-0 ${isOwn ? "text-right" : ""}`}>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-medium text-sm text-slate-900">
            {message.sender.name}
          </span>
          <span className="text-xs text-slate-500">{timeStr}</span>
          {message.isEdited && (
            <span className="text-xs text-slate-400">(изменено)</span>
          )}
        </div>

        <div
          className={`inline-block px-3 py-2 rounded-lg ${
            isOwn
              ? "bg-emerald-500 text-white"
              : "bg-slate-100 text-slate-900"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>

        {/* Actions */}
        {(isOwn || canDelete) && (
          <div className="mt-1 flex gap-2 text-xs">
            {isOwn && onEdit && (
              <button
                onClick={() => onEdit(message.id)}
                className="text-slate-500 hover:text-slate-700"
              >
                Редактировать
              </button>
            )}
            {(isOwn || canDelete) && onDelete && (
              <button
                onClick={() => onDelete(message.id)}
                className="text-red-500 hover:text-red-700"
              >
                Удалить
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
