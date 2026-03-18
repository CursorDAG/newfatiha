"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

interface ChatContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const ChatContext = createContext<ChatContextType>({
  socket: null,
  isConnected: false,
});

export function useChatSocket() {
  return useContext(ChatContext);
}

interface ChatProviderProps {
  children: React.ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    // Initialize socket connection
    const socketInstance = io({
      auth: {
        token: session.user.id,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketInstance.on("connect", () => {
      console.log("Socket connected");
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setIsConnected(false);
    });

    socketInstance.on("error", (error: { message: string }) => {
      console.error("Socket error:", error.message);
    });

    // Set socket after all event handlers are attached
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [session]);

  return (
    <ChatContext.Provider value={{ socket, isConnected }}>
      {children}
    </ChatContext.Provider>
  );
}
