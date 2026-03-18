import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { validateRequest } from "@/lib/validate-request";
import { replyToTicketSchema } from "@/lib/validation";
import { NotificationService } from "@/lib/notification-service";

// POST: reply to a support ticket
export const POST = withErrorHandling(
  async (req: Request, context?: { params: Promise<Record<string, string>> }) => {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new AuthError("Unauthorized");
    }

    const params = await context?.params;
    const ticketId = params?.ticketId;

    if (!ticketId) {
      throw new NotFoundError("Ticket");
    }

    const { message } = await validateRequest(req, replyToTicketSchema);

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { userId: true, assignedToId: true },
    });

    if (!ticket) {
      throw new NotFoundError("Ticket");
    }

    // Check access: user can only reply to their own tickets
    if (ticket.userId !== session.user.id) {
      throw new ForbiddenError("Access denied");
    }

    const reply = await prisma.supportTicketReply.create({
      data: {
        ticketId,
        userId: session.user.id,
        message,
        isStaff: false,
      },
    });

    // Update ticket updatedAt
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() },
    });

    // Notify assigned moderator if exists
    if (ticket.assignedToId) {
      await NotificationService.create({
        userId: ticket.assignedToId,
        type: "SUPPORT_TICKET_REPLY",
        title: "Новый ответ в обращении",
        message: `Пользователь ответил в обращении`,
        link: `/moderator?tab=tickets&ticketId=${ticketId}`,
      });
    }

    return NextResponse.json({ success: true, reply });
  }
);
