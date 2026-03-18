/**
 * Chat permissions and access control
 */
import { prisma } from "@/lib/prisma";

/**
 * Check if user can access a chat room
 */
export async function canAccessRoom(
  userId: string,
  roomId: string
): Promise<boolean> {
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: {
      stream: {
        include: {
          enrollments: {
            where: { userId, status: "ACTIVE" },
          },
        },
      },
    },
  });

  if (!room) return false;

  // GROUP chat: user must be enrolled in the stream or be the teacher
  if (room.type === "GROUP" && room.streamId) {
    const stream = room.stream;
    if (!stream) return false;

    // Check if user is the teacher
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === "TEACHER" || user?.role === "ADMIN") {
      // Teachers and admins can access any group chat
      return true;
    }

    // Check if user is enrolled in the stream
    return stream.enrollments.length > 0;
  }

  // DIRECT chat: user must be one of the participants
  if (room.type === "DIRECT") {
    return (
      room.participant1Id === userId || room.participant2Id === userId
    );
  }

  return false;
}

/**
 * Check if user can send a direct message to another user
 */
export async function canSendDirectMessage(
  senderId: string,
  recipientId: string
): Promise<boolean> {
  // Get both users
  const [sender, recipient] = await Promise.all([
    prisma.user.findUnique({
      where: { id: senderId },
      select: { role: true, gender: true },
    }),
    prisma.user.findUnique({
      where: { id: recipientId },
      select: { role: true, gender: true },
    }),
  ]);

  if (!sender || !recipient) return false;

  // Admin and moderators can message anyone
  if (sender.role === "ADMIN" || sender.role === "MODERATOR") {
    return true;
  }

  // Teachers can message each other
  if (sender.role === "TEACHER" && recipient.role === "TEACHER") {
    return true;
  }

  // Student cannot message another student
  if (sender.role === "STUDENT" && recipient.role === "STUDENT") {
    return false;
  }

  // Student → Teacher: check if they study together
  if (sender.role === "STUDENT" && recipient.role === "TEACHER") {
    // Check if student is enrolled in any stream taught by this teacher
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: senderId,
        status: "ACTIVE",
        stream: {
          teacherId: recipientId,
        },
      },
    });

    if (!enrollment) return false;

    // Gender restriction: male student cannot message female teacher directly
    if (sender.gender === "MALE" && recipient.gender === "FEMALE") {
      return false;
    }

    return true;
  }

  // Teacher → Student: check if teacher teaches this student
  if (sender.role === "TEACHER" && recipient.role === "STUDENT") {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: recipientId,
        status: "ACTIVE",
        stream: {
          teacherId: senderId,
        },
      },
    });

    return !!enrollment;
  }

  return false;
}

/**
 * Check if user can delete a message
 */
export async function canDeleteMessage(
  userId: string,
  messageId: string
): Promise<boolean> {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: {
      room: {
        include: {
          stream: true,
        },
      },
    },
  });

  if (!message) return false;

  // User can delete their own messages
  if (message.senderId === userId) return true;

  // Get user role
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) return false;

  // Admin can delete any message
  if (user.role === "ADMIN") return true;

  // Teacher can delete any message in their group chat
  if (
    user.role === "TEACHER" &&
    message.room.type === "GROUP" &&
    message.room.stream?.teacherId === userId
  ) {
    return true;
  }

  return false;
}

/**
 * Check if user can edit a message
 */
export async function canEditMessage(
  userId: string,
  messageId: string
): Promise<boolean> {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: {
      senderId: true,
      createdAt: true,
      isDeleted: true,
    },
  });

  if (!message || message.isDeleted) return false;

  // Only the sender can edit their message
  if (message.senderId !== userId) return false;

  // Check if message is older than 15 minutes
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  if (message.createdAt < fifteenMinutesAgo) return false;

  return true;
}
