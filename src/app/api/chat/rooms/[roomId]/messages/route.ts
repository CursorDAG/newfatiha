/**
 * GET /api/chat/rooms/[roomId]/messages - Get message history
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, ValidationError } from "@/lib/errors";
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

    // Parse query params
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get messages
    const messages = await prisma.chatMessage.findMany({
      where: {
        roomId,
        isDeleted: false,
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
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    });

    // Get total count
    const total = await prisma.chatMessage.count({
      where: {
        roomId,
        isDeleted: false,
      },
    });

    return NextResponse.json({
      messages: messages.reverse(), // Return in chronological order
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  }
);
