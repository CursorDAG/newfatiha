/**
 * POST /api/chat/rooms/direct - Create or get direct chat
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ValidationError, ForbiddenError } from "@/lib/errors";
import { canSendDirectMessage } from "@/lib/chat-permissions";

export const POST = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Unauthorized");
  }

  const userId = session.user.id;
  const body = await req.json();
  const { recipientId } = body;

  if (!recipientId) {
    throw new ValidationError("recipientId is required");
  }

  if (recipientId === userId) {
    throw new ValidationError("Cannot create chat with yourself");
  }

  // Check if user can send direct message to recipient
  const canSend = await canSendDirectMessage(userId, recipientId);
  if (!canSend) {
    throw new ForbiddenError(
      "You cannot send direct messages to this user. Students can only message their teachers, and male students cannot message female teachers directly."
    );
  }

  // Check if chat already exists
  // Need to check both orderings since participant1/participant2 could be in either order
  const existingRoom = await prisma.chatRoom.findFirst({
    where: {
      type: "DIRECT",
      OR: [
        {
          participant1Id: userId,
          participant2Id: recipientId,
        },
        {
          participant1Id: recipientId,
          participant2Id: userId,
        },
      ],
    },
    include: {
      participant1: {
        select: {
          id: true,
          name: true,
          avatar: true,
          role: true,
        },
      },
      participant2: {
        select: {
          id: true,
          name: true,
          avatar: true,
          role: true,
        },
      },
    },
  });

  if (existingRoom) {
    return NextResponse.json({ room: existingRoom });
  }

  // Create new chat room
  const newRoom = await prisma.chatRoom.create({
    data: {
      type: "DIRECT",
      participant1Id: userId,
      participant2Id: recipientId,
    },
    include: {
      participant1: {
        select: {
          id: true,
          name: true,
          avatar: true,
          role: true,
        },
      },
      participant2: {
        select: {
          id: true,
          name: true,
          avatar: true,
          role: true,
        },
      },
    },
  });

  return NextResponse.json({ room: newRoom }, { status: 201 });
});
