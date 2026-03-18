/**
 * WebSocket server for real-time chat
 */
import { Server as SocketIOServer, Socket } from "socket.io";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  canAccessRoom,
  canDeleteMessage,
  canEditMessage,
} from "@/lib/chat-permissions";

interface SocketData {
  userId: string;
  userName: string;
}

interface MessageSendPayload {
  roomId: string;
  content: string;
}

interface MessageEditPayload {
  messageId: string;
  content: string;
}

interface MessageDeletePayload {
  messageId: string;
}

interface TypingPayload {
  roomId: string;
}

interface RoomPayload {
  roomId: string;
}

/**
 * Initialize Socket.io server with authentication and event handlers
 */
export function initSocketServer(io: SocketIOServer) {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        logger.warn("Socket connection rejected: no token");
        return next(new Error("Authentication required"));
      }

      // Verify JWT token
      const decoded = await getToken({
        req: {
          headers: { authorization: `Bearer ${token}` },
          cookies: { "next-auth.session-token": token },
        } as never,
        secret: process.env.NEXTAUTH_SECRET!,
      });

      if (!decoded || !decoded.id) {
        logger.warn("Socket connection rejected: invalid token");
        return next(new Error("Invalid token"));
      }

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.id as string },
        select: { id: true, name: true, isBlocked: true },
      });

      if (!user || user.isBlocked) {
        logger.warn(`Socket connection rejected: user blocked or not found`);
        return next(new Error("User not found or blocked"));
      }

      // Store user data in socket
      socket.data = {
        userId: user.id,
        userName: user.name,
      } as SocketData;

      logger.info(`Socket authenticated: ${user.id} (${user.name})`);
      next();
    } catch (error) {
      logger.error({ error }, "Socket authentication error");
      next(new Error("Authentication failed"));
    }
  });

  // Connection handler
  io.on("connection", (socket: Socket) => {
    const data = socket.data as SocketData;
    logger.info(`Socket connected: ${data.userId}`);

    // Broadcast user online status
    socket.broadcast.emit("user:online", { userId: data.userId });

    // Join room
    socket.on("room:join", async (payload: RoomPayload) => {
      try {
        const { roomId } = payload;

        // Check access
        const hasAccess = await canAccessRoom(data.userId, roomId);
        if (!hasAccess) {
          socket.emit("error", { message: "Access denied to this room" });
          return;
        }

        // Join Socket.io room
        await socket.join(roomId);
        logger.info(`User ${data.userId} joined room ${roomId}`);

        socket.emit("room:joined", { roomId });
      } catch (error) {
        logger.error({ error }, "Error joining room");
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // Leave room
    socket.on("room:leave", async (payload: RoomPayload) => {
      try {
        const { roomId } = payload;
        await socket.leave(roomId);
        logger.info(`User ${data.userId} left room ${roomId}`);
      } catch (error) {
        logger.error({ error }, "Error leaving room");
      }
    });

    // Send message
    socket.on("message:send", async (payload: MessageSendPayload) => {
      try {
        const { roomId, content } = payload;

        if (!content || content.trim().length === 0) {
          socket.emit("error", { message: "Message content is required" });
          return;
        }

        if (content.length > 5000) {
          socket.emit("error", { message: "Message too long (max 5000 characters)" });
          return;
        }

        // Check access
        const hasAccess = await canAccessRoom(data.userId, roomId);
        if (!hasAccess) {
          socket.emit("error", { message: "Access denied to this room" });
          return;
        }

        // Save message to database
        const message = await prisma.chatMessage.create({
          data: {
            roomId,
            senderId: data.userId,
            content: content.trim(),
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
                role: true,
              },
            },
          },
        });

        logger.info(`Message sent: ${message.id} in room ${roomId}`);

        // Broadcast to all users in the room
        io.to(roomId).emit("message:receive", message);
      } catch (error) {
        logger.error({ error }, "Error sending message");
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Edit message
    socket.on("message:edit", async (payload: MessageEditPayload) => {
      try {
        const { messageId, content } = payload;

        if (!content || content.trim().length === 0) {
          socket.emit("error", { message: "Message content is required" });
          return;
        }

        // Check if user can edit
        const canEdit = await canEditMessage(data.userId, messageId);
        if (!canEdit) {
          socket.emit("error", {
            message: "Cannot edit this message (not yours or too old)",
          });
          return;
        }

        // Update message
        const message = await prisma.chatMessage.update({
          where: { id: messageId },
          data: {
            content: content.trim(),
            isEdited: true,
            editedAt: new Date(),
          },
          select: {
            id: true,
            roomId: true,
            content: true,
            editedAt: true,
          },
        });

        logger.info(`Message edited: ${messageId}`);

        // Broadcast to room
        io.to(message.roomId).emit("message:edited", {
          messageId: message.id,
          content: message.content,
          editedAt: message.editedAt,
        });
      } catch (error) {
        logger.error({ error }, "Error editing message");
        socket.emit("error", { message: "Failed to edit message" });
      }
    });

    // Delete message
    socket.on("message:delete", async (payload: MessageDeletePayload) => {
      try {
        const { messageId } = payload;

        // Check if user can delete
        const canDelete = await canDeleteMessage(data.userId, messageId);
        if (!canDelete) {
          socket.emit("error", { message: "Cannot delete this message" });
          return;
        }

        // Soft delete
        const message = await prisma.chatMessage.update({
          where: { id: messageId },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
          select: {
            id: true,
            roomId: true,
          },
        });

        logger.info(`Message deleted: ${messageId}`);

        // Broadcast to room
        io.to(message.roomId).emit("message:deleted", {
          messageId: message.id,
        });
      } catch (error) {
        logger.error({ error }, "Error deleting message");
        socket.emit("error", { message: "Failed to delete message" });
      }
    });

    // Typing start
    socket.on("typing:start", async (payload: TypingPayload) => {
      try {
        const { roomId } = payload;

        // Check access
        const hasAccess = await canAccessRoom(data.userId, roomId);
        if (!hasAccess) return;

        // Broadcast to others in room (not to sender)
        socket.to(roomId).emit("typing:user", {
          userId: data.userId,
          userName: data.userName,
        });
      } catch (error) {
        logger.error({ error }, "Error handling typing:start");
      }
    });

    // Typing stop
    socket.on("typing:stop", async (payload: TypingPayload) => {
      try {
        const { roomId } = payload;

        // Check access
        const hasAccess = await canAccessRoom(data.userId, roomId);
        if (!hasAccess) return;

        // Broadcast to others in room
        socket.to(roomId).emit("typing:stop", {
          userId: data.userId,
        });
      } catch (error) {
        logger.error({ error }, "Error handling typing:stop");
      }
    });

    // Disconnect
    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${data.userId}`);

      // Broadcast user offline status
      socket.broadcast.emit("user:offline", { userId: data.userId });
    });
  });

  logger.info("Socket.io server initialized");
}
