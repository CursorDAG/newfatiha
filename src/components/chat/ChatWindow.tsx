"use client";

import React, { useEffect, useState, useRef } from "react";
import { useChatSocket } from "./ChatProvider";
import { MessageItem } from "./MessageItem";
import { MessageInput } from "./MessageInput";
import { TypingIndicator } from "./TypingIndicator";

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: {
    id: string;
    name: string;
    avatar?: string | null;
    role: string;
  };
  createdAt: Date | string;
  isEdited: boolean;
  editedAt?: Date | string | null;
  isDeleted: boolean;
}

interface ChatWindowProps {
  roomId: string;
  roomName: string;
  currentUserId: string;
  canDeleteAnyMessage?: boolean;
  onClose?: () => void;
}

export function ChatWindow({
  roomId,
  roomName,
  currentUserId,
  canDeleteAnyMessage = false,
  onClose,
}: ChatWindowProps) {
  const { socket, isConnected } = useChatSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(
    new Map()
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Load message history
  useEffect(() => {
    async function loadMessages() {
      try {
        const res = await fetch(`/api/chat/rooms/${roomId}/messages?limit=50`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages);
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
      } finally {
        setLoading(false);
      }
    }

    loadMessages();
  }, [roomId]);

  // Join room and setup socket listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Join room
    socket.emit("room:join", { roomId });

    // Listen for new messages
    const handleMessageReceive = (message: Message) => {
      setMessages((prev) => [...prev, message]);
    };

    // Listen for message edits
    const handleMessageEdited = ({
      messageId,
      content,
      editedAt,
    }: {
      messageId: string;
      content: string;
      editedAt: Date;
    }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, content, isEdited: true, editedAt }
            : msg
        )
      );
    };

    // Listen for message deletes
    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, isDeleted: true } : msg
        )
      );
    };

    // Listen for typing indicators
    const handleTypingUser = ({
      userId,
      userName,
    }: {
      userId: string;
      userName: string;
    }) => {
      if (userId === currentUserId) return;

      setTypingUsers((prev) => new Map(prev).set(userId, userName));

      // Clear existing timeout
      const existingTimeout = typingTimeoutsRef.current.get(userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new timeout
      const timeout = setTimeout(() => {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(userId);
          return next;
        });
        typingTimeoutsRef.current.delete(userId);
      }, 3000);

      typingTimeoutsRef.current.set(userId, timeout);
    };

    const handleTypingStop = ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });

      const timeout = typingTimeoutsRef.current.get(userId);
      if (timeout) {
        clearTimeout(timeout);
        typingTimeoutsRef.current.delete(userId);
      }
    };

    socket.on("message:receive", handleMessageReceive);
    socket.on("message:edited", handleMessageEdited);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("typing:user", handleTypingUser);
    socket.on("typing:stop", handleTypingStop);

    return () => {
      socket.emit("room:leave", { roomId });
      socket.off("message:receive", handleMessageReceive);
      socket.off("message:edited", handleMessageEdited);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("typing:user", handleTypingUser);
      socket.off("typing:stop", handleTypingStop);

      // Clear all typing timeouts
      typingTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutsRef.current.clear();
    };
  }, [socket, isConnected, roomId, currentUserId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (content: string) => {
    if (!socket || !isConnected) {
      // Fallback to REST API
      fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, content }),
      }).catch((error) => {
        console.error("Failed to send message:", error);
      });
      return;
    }

    socket.emit("message:send", { roomId, content });
  };

  const handleTypingStart = () => {
    if (socket && isConnected) {
      socket.emit("typing:start", { roomId });
    }
  };

  const handleTypingStop = () => {
    if (socket && isConnected) {
      socket.emit("typing:stop", { roomId });
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!socket || !isConnected) {
      fetch(`/api/chat/messages/${messageId}`, {
        method: "DELETE",
      }).catch((error) => {
        console.error("Failed to delete message:", error);
      });
      return;
    }

    socket.emit("message:delete", { messageId });
  };

  const typingUserNames = Array.from(typingUsers.values());

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div>
          <h3 className="font-semibold text-slate-900">{roomName}</h3>
          <p className="text-xs text-slate-500">
            {isConnected ? "Подключено" : "Отключено"}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-slate-500">Загрузка...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-slate-500 text-center">
              <p>Нет сообщений</p>
              <p className="text-sm mt-1">Начните разговор!</p>
            </div>
          </div>
        ) : (
          <div>
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                currentUserId={currentUserId}
                onDelete={handleDeleteMessage}
                canDelete={canDeleteAnyMessage}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Typing indicator */}
        {typingUserNames.length > 0 && (
          <TypingIndicator userName={typingUserNames[0]} />
        )}
      </div>

      {/* Input */}
      <MessageInput
        onSend={handleSendMessage}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        disabled={!isConnected}
        placeholder={
          isConnected ? "Введите сообщение..." : "Подключение..."
        }
      />
    </div>
  );
}
