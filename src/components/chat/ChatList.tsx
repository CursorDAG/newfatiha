"use client";

import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { NewChatModal } from "./NewChatModal";

interface Room {
  id: string;
  type: "GROUP" | "DIRECT";
  name: string;
  lastMessage?: {
    content: string;
    createdAt: Date | string;
    sender: {
      name: string;
    };
  } | null;
  unreadCount: number;
}

interface ChatListProps {
  onSelectRoom: (roomId: string, roomName: string) => void;
  selectedRoomId?: string;
}

export function ChatList({ onSelectRoom, selectedRoomId }: ChatListProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  const loadRooms = async () => {
    try {
      const res = await fetch("/api/chat/rooms");
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms);
      }
    } catch (error) {
      console.error("Failed to load rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleNewChatCreated = (roomId: string, userName: string) => {
    loadRooms(); // Reload rooms list
    onSelectRoom(roomId, userName); // Select the new room
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500">Загрузка...</div>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-slate-500 text-center">
          <p>Нет чатов</p>
          <p className="text-sm mt-1">
            Чаты появятся когда вы запишетесь на поток
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
        <h2 className="font-bold text-lg text-slate-900">Чаты</h2>
        <button
          onClick={() => setShowNewChatModal(true)}
          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
          title="Новое сообщение"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {rooms.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-slate-500 text-center">
            <p>Нет чатов</p>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="mt-3 text-emerald-600 hover:text-emerald-700 text-sm font-medium"
            >
              Начать новый чат
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">{rooms.map((room) => {
          const isSelected = room.id === selectedRoomId;
          const lastMessageTime = room.lastMessage?.createdAt
            ? new Date(room.lastMessage.createdAt).toLocaleTimeString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";

          return (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room.id, room.name)}
              className={`w-full px-6 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors text-left ${
                isSelected ? "bg-emerald-50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 truncate">
                      {room.name}
                    </h3>
                    {room.type === "GROUP" && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded flex-shrink-0">
                        Группа
                      </span>
                    )}
                  </div>

                  {room.lastMessage && (
                    <p className="text-sm text-slate-600 truncate">
                      <span className="font-medium">
                        {room.lastMessage.sender.name}:
                      </span>{" "}
                      {room.lastMessage.content}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {lastMessageTime && (
                    <span className="text-xs text-slate-500">
                      {lastMessageTime}
                    </span>
                  )}
                  {room.unreadCount > 0 && (
                    <span className="bg-emerald-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                      {room.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
        </div>
      )}

      {showNewChatModal && (
        <NewChatModal
          onClose={() => setShowNewChatModal(false)}
          onSelectUser={handleNewChatCreated}
        />
      )}
    </div>
  );
}
