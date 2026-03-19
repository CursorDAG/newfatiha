"use client";

import React, { useState, useRef, useEffect } from "react";

interface MessageInputProps {
  onSend: (content: string) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSend,
  onTypingStart,
  onTypingStop,
  disabled = false,
  placeholder = "Введите сообщение...",
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Typing indicator logic
    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
      onTypingStart?.();
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTypingStop?.();
    }, 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (content.trim().length === 0 || disabled) {
      return;
    }

    onSend(content.trim());
    setContent("");

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      onTypingStop?.();
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-slate-200 p-4">
      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className="flex-1 resize-none border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed max-h-32 overflow-y-auto"
        />
        <button
          type="submit"
          disabled={disabled || content.trim().length === 0}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          Отправить
        </button>
      </div>
      <p className="text-xs text-slate-500 mt-1">
        Enter для отправки, Shift+Enter для новой строки
      </p>
    </form>
  );
}
