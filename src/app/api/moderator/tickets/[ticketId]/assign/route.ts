import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, NotFoundError } from "@/lib/errors";
import { NotificationService } from "@/lib/notification-service";

// POST: assign ticket to current moderator
export const POST = withErrorHandling(
  async (_req: Request, context?: { params: Promise<Record<string, string>> }) => {
    const session = await getServerSession(authOptions);
    if (!session || !["MODERATOR", "ADMIN"].includes(session.user.role)) {
      throw new AuthError("Unauthorized");
    }

    const params = await context?.params;
    const ticketId = params?.ticketId;

    if (!ticketId) {
      throw new NotFoundError("Ticket");
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { userId: true, status: true },
    });

    if (!ticket) {
      throw new NotFoundError("Ticket");
    }

    const updateData: Record<string, unknown> = {
      assignedToId: session.user.id,
    };

    // If ticket is OPEN, change to IN_PROGRESS
    if (ticket.status === "OPEN") {
      updateData.status = "IN_PROGRESS";
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
    });

    // Notify user that their ticket is being handled
    await NotificationService.create({
      userId: ticket.userId,
      type: "SUPPORT_TICKET_REPLY",
      title: "Ваше обращение взято в работу",
      message: `Модератор ${session.user.name} начал работу над вашим обращением`,
      link: `/support?ticketId=${ticketId}`,
    });

    return NextResponse.json({ success: true, ticket: updatedTicket });
  }
);
