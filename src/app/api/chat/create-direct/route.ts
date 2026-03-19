/**
 * POST /api/chat/create-direct - Create or get existing direct chat room
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ValidationError, NotFoundError } from "@/lib/errors";

export const POST = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Unauthorized");
  }

  const body = await req.json();
  const { otherUserId } = body;

  if (!otherUserId) {
    throw new ValidationError("otherUserId is required");
  }

  if (otherUserId === session.user.id) {
    throw new ValidationError("Cannot create chat with yourself");
  }

  // Check if other user exists
  const otherUser = await prisma.user.findUnique({
    where: { id: otherUserId },
    select: { id: true, name: true, isBlocked: true },
  });

  if (!otherUser) {
    throw new NotFoundError("User not found");
  }

  if (otherUser.isBlocked) {
    throw new ValidationError("Cannot create chat with blocked user");
  }

  // Check if direct chat already exists (in either direction)
  const existingRoom = await prisma.chatRoom.findFirst({
    where: {
      type: "DIRECT",
      OR: [
        {
          participant1Id: session.user.id,
          participant2Id: otherUserId,
        },
        {
          participant1Id: otherUserId,
          participant2Id: session.user.id,
        },
      ],
    },
  });

  if (existingRoom) {
    return NextResponse.json({ roomId: existingRoom.id });
  }

  // Create new direct chat room
  const newRoom = await prisma.chatRoom.create({
    data: {
      type: "DIRECT",
      participant1Id: session.user.id,
      participant2Id: otherUserId,
    },
  });

  return NextResponse.json({ roomId: newRoom.id });
});
