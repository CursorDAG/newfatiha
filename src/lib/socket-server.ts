/**
 * WebSocket server for real-time chat and notifications
 */
import { Server as SocketIOServer, Socket } from "socket.io";
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
  lastActivity: number;
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
 * Get Socket.io server instance for sending notifications
 */
let ioInstance: SocketIOServer | null = null;

export function getSocketServer(): SocketIOServer | null {
  return ioInstance;
}

/**
 * Send notification to user via Socket.io
 */
export async function sendNotificationToUser(
  userId: string,
  notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    priority: string;
    createdAt: Date;
  }
) {
  if (!ioInstance) {
    logger.warn("Socket.io server not initialized, cannot send notification");
    return;
  }

  try {
    // Send to user's personal room
    ioInstance.to(`user:${userId}`).emit("notification:receive", notification);

    // Update unread count
    const unreadCount = await prisma.notification.count({
      where: { userId, read: false },
    });
    ioInstance.to(`user:${userId}`).emit("notification:unread_count", { count: unreadCount });

    logger.debug({ userId, notificationId: notification.id }, "Notification sent via Socket.io");
  } catch (error) {
    logger.error({ error, userId }, "Failed to send notification via Socket.io");
  }
}

/**
 * Timeout for inactive connections (30 minutes)
 */
const INACTIVE_TIMEOUT = 30 * 60 * 1000;

/**
 * Interval for checking inactive connections (5 minutes)
 */
const CLEANUP_INTERVAL = 5 * 60 * 1000;

/**
 * Initialize Socket.io server with authentication and event handlers
 */
export function initSocketServer(io: SocketIOServer) {
  // Store instance for notification sending
  ioInstance = io;

  // Периодическая очистка неактивных соединений
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    const sockets = io.sockets.sockets;
    let disconnected = 0;

    sockets.forEach((socket) => {
      const data = socket.data as SocketData;
      if (data.lastActivity && now - data.lastActivity > INACTIVE_TIMEOUT) {
        logger.info({
          msg: "Disconnecting inactive socket",
          userId: data.userId,
          inactiveFor: Math.round((now - data.lastActivity) / 1000 / 60) + " minutes",
        });
        socket.disconnect(true);
        disconnected++;
      }
    });

    if (disconnected > 0 || sockets.size > 0) {
      logger.debug({
        msg: "Socket cleanup completed",
        totalSockets: sockets.size,
        disconnected,
      });
    }
  }, CLEANUP_INTERVAL);

  // Graceful shutdown
  process.on("SIGTERM", () => {
    clearInterval(cleanupInterval);
    io.close();
  });
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const userId = socket.handshake.auth.token;

      if (!userId) {
        logger.warn("Socket connection rejected: no user ID");
        return next(new Error("Authentication required"));
      }

      // Get user from database and verify they exist and are not blocked
      const user = await prisma.user.findUnique({
        where: { id: userId },
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
        lastActivity: Date.now(),
      } as SocketData;

      logger.info(`Socket authenticated: ${user.id} (${user.name})`);
      next();
    } catch (error) {
      logger.error({ error }, "Socket authentication error");
      next(new Error("Authentication failed"));
    }
  });

  // Connection handler
  io.on("connection", async (socket: Socket) => {
    const data = socket.data as SocketData;
    logger.info({
      msg: "Socket connected",
      userId: data.userId,
      totalConnections: io.sockets.sockets.size,
    });

    // Join user's personal notification room
    await socket.join(`user:${data.userId}`);

    // Send unread notification count on connection
    try {
      const unreadCount = await prisma.notification.count({
        where: {
          userId: data.userId,
          read: false,
        },
      });
      socket.emit("notification:unread_count", { count: unreadCount });
    } catch (error) {
      logger.error({ error, userId: data.userId }, "Failed to fetch unread count");
    }

    // Broadcast user online status
    socket.broadcast.emit("user:online", { userId: data.userId });

    // Обновляем время последней активности при любом событии
    const updateActivity = () => {
      data.lastActivity = Date.now();
    };

    // Join room
    socket.on("room:join", async (payload: RoomPayload) => {
      updateActivity();
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
      updateActivity();
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
      updateActivity();
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
      updateActivity();
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
      updateActivity();
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
      updateActivity();
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
      updateActivity();
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

    // Mark notification as read
    socket.on("notification:mark_read", async (payload: { notificationId: string }) => {
      updateActivity();
      try {
        const { notificationId } = payload;

        // Verify ownership and mark as read
        const notification = await prisma.notification.findUnique({
          where: { id: notificationId },
        });

        if (notification && notification.userId === data.userId) {
          await prisma.notification.update({
            where: { id: notificationId },
            data: { read: true, readAt: new Date() },
          });

          // Send updated unread count
          const unreadCount = await prisma.notification.count({
            where: { userId: data.userId, read: false },
          });
          socket.emit("notification:unread_count", { count: unreadCount });
        }
      } catch (error) {
        logger.error({ error }, "Error marking notification as read");
      }
    });

    // Disconnect
    socket.on("disconnect", () => {
      logger.info({
        msg: "Socket disconnected",
        userId: data.userId,
        totalConnections: io.sockets.sockets.size,
      });

      // Очищаем комнаты при отключении
      socket.rooms.forEach((room) => {
        if (room !== socket.id) {
          socket.leave(room);
        }
      });

      // Broadcast user offline status
      socket.broadcast.emit("user:offline", { userId: data.userId });
    });
  });

  logger.info("Socket.io server initialized");
}
