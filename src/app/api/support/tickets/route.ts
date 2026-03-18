import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError } from "@/lib/errors";
import { validateRequest } from "@/lib/validate-request";
import { createSupportTicketSchema } from "@/lib/validation";
import { NotificationService } from "@/lib/notification-service";

// GET: fetch user's support tickets
export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new AuthError("Unauthorized");
  }

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: session.user.id },
    include: {
      _count: {
        select: { replies: true },
      },
      assignedTo: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tickets });
});

// POST: create a new support ticket
export const POST = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new AuthError("Unauthorized");
  }

  const { subject, description, priority } = await validateRequest(
    req,
    createSupportTicketSchema
  );

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: session.user.id,
      subject,
      description,
      priority: priority || "MEDIUM",
    },
  });

  // Notify all moderators and admins about new ticket
  const moderators = await prisma.user.findMany({
    where: {
      role: { in: ["MODERATOR", "ADMIN"] },
    },
    select: { id: true },
  });

  if (moderators.length > 0) {
    await NotificationService.createMany(
      moderators.map((m) => m.id),
      {
        type: "SUPPORT_TICKET_REPLY",
        title: "Новое обращение в техподдержку",
        message: `${session.user.name}: ${subject}`,
        link: `/moderator?tab=tickets&ticketId=${ticket.id}`,
      }
    );
  }

  return NextResponse.json({ success: true, ticket });
});
