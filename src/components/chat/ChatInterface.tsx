"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { ChatList } from "./ChatList";
import { ChatWindow } from "./ChatWindow";

export function ChatInterface() {
  const { data: session } = useSession();
  const [selectedRoom, setSelectedRoom] = useState<{
    id: string;
    name: string;
  } | null>(null);

  if (!session?.user) {
    return null;
  }

  const handleSelectRoom = (roomId: string, roomName: string) => {
    setSelectedRoom({ id: roomId, name: roomName });
  };

  const handleCloseChat = () => {
    setSelectedRoom(null);
  };

  return (
    <div className="flex h-[calc(100vh-160px)] sm:h-[calc(100vh-200px)] min-h-[500px] sm:min-h-[600px] bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-slate-200">
      {/* Chat list sidebar */}
      <div
        className={`w-full md:w-80 border-r border-slate-200 flex-shrink-0 ${
          selectedRoom ? "hidden md:block" : "block"
        }`}
      >
        <ChatList
          onSelectRoom={handleSelectRoom}
          selectedRoomId={selectedRoom?.id}
        />
      </div>

      {/* Chat window */}
      <div
        className={`flex-1 flex-col ${
          selectedRoom ? "flex" : "hidden md:flex"
        }`}
      >
        {selectedRoom ? (
          <ChatWindow
            roomId={selectedRoom.id}
            roomName={selectedRoom.name}
            currentUserId={session.user.id}
            canDeleteAnyMessage={session.user.role === "TEACHER" || session.user.role === "ADMIN"}
            onClose={handleCloseChat}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            Выберите чат для начала общения
          </div>
        )}
      </div>
    </div>
  );
}
