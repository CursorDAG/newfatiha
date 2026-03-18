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
    <div className="flex h-[600px] max-w-5xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Chat list sidebar */}
      <div className="w-80 border-r border-slate-200">
        <ChatList
          onSelectRoom={handleSelectRoom}
          selectedRoomId={selectedRoom?.id}
        />
      </div>

      {/* Chat window */}
      <div className="flex-1">
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
