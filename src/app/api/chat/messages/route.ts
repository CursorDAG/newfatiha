/**
 * POST /api/chat/messages - Send message (fallback if WebSocket unavailable)
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ValidationError, ForbiddenError } from "@/lib/errors";
import { canAccessRoom } from "@/lib/chat-permissions";

export const POST = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Unauthorized");
  }

  const userId = session.user.id;
  const body = await req.json();
  const { roomId, content } = body;

  if (!roomId || !content) {
    throw new ValidationError("roomId and content are required");
  }

  if (content.trim().length === 0) {
    throw new ValidationError("Message content cannot be empty");
  }

  if (content.length > 5000) {
    throw new ValidationError("Message too long (max 5000 characters)");
  }

  // Check access
  const hasAccess = await canAccessRoom(userId, roomId);
  if (!hasAccess) {
    throw new ForbiddenError("Access denied to this room");
  }

  // Create message
  const message = await prisma.chatMessage.create({
    data: {
      roomId,
      senderId: userId,
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

  return NextResponse.json({ message }, { status: 201 });
});
