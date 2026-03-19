/**
 * GET /api/chat/rooms/[roomId] - Get chat room details
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { canAccessRoom } from "@/lib/chat-permissions";

export const GET = withErrorHandling(
  async (req: Request, context?: { params: Promise<Record<string, string>> }) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AuthError("Unauthorized");
    }

    const params = await context?.params;
    const roomId = params?.roomId;
    if (!roomId) {
      throw new ValidationError("roomId is required");
    }

    const userId = session.user.id;

    // Check access
    const hasAccess = await canAccessRoom(userId, roomId);
    if (!hasAccess) {
      throw new ForbiddenError("Access denied to this room");
    }

    // Get room details
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        stream: {
          select: {
            id: true,
            name: true,
            teacherId: true,
          },
        },
        participant1: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
        participant2: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    // Format response
    const response: {
      id: string;
      type: string;
      createdAt: Date;
      name?: string;
      streamId?: string;
      teacherId?: string;
      otherUser?: { id: string; name: string; email: string };
    } = {
      id: room.id,
      type: room.type,
      createdAt: room.createdAt,
    };

    if (room.type === "GROUP" && room.stream) {
      response.name = room.stream.name;
      response.streamId = room.stream.id;
      response.teacherId = room.stream.teacherId;
    } else if (room.type === "DIRECT") {
      const otherUser =
        room.participant1Id === userId ? room.participant2 : room.participant1;
      response.name = otherUser?.name || "Unknown";
      if (otherUser) {
        response.otherUser = {
          id: otherUser.id,
          name: otherUser.name,
          email: otherUser.email,
        };
      }
    }

    return NextResponse.json(response);
  }
);
