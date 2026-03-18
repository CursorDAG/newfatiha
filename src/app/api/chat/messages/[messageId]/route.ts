/**
 * PATCH /api/chat/messages/[messageId] - Edit message
 * DELETE /api/chat/messages/[messageId] - Delete message
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import {
  AuthError,
  ValidationError,
  ForbiddenError,
} from "@/lib/errors";
import { canEditMessage, canDeleteMessage } from "@/lib/chat-permissions";

export const PATCH = withErrorHandling(
  async (req: Request, context?: { params: Promise<Record<string, string>> }) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AuthError("Unauthorized");
    }

    const params = await context?.params;
    const messageId = params?.messageId;
    if (!messageId) {
      throw new ValidationError("messageId is required");
    }

    const userId = session.user.id;
    const body = await req.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      throw new ValidationError("Message content is required");
    }

    if (content.length > 5000) {
      throw new ValidationError("Message too long (max 5000 characters)");
    }

    // Check if user can edit
    const canEdit = await canEditMessage(userId, messageId);
    if (!canEdit) {
      throw new ForbiddenError(
        "Cannot edit this message (not yours or older than 15 minutes)"
      );
    }

    // Update message
    const message = await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
        isEdited: true,
        editedAt: new Date(),
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

    return NextResponse.json({ message });
  }
);

export const DELETE = withErrorHandling(
  async (req: Request, context?: { params: Promise<Record<string, string>> }) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AuthError("Unauthorized");
    }

    const params = await context?.params;
    const messageId = params?.messageId;
    if (!messageId) {
      throw new ValidationError("messageId is required");
    }

    const userId = session.user.id;

    // Check if user can delete
    const canDelete = await canDeleteMessage(userId, messageId);
    if (!canDelete) {
      throw new ForbiddenError("Cannot delete this message");
    }

    // Soft delete
    const message = await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, messageId: message.id });
  }
);
