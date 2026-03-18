import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, NotFoundError, ValidationError } from "@/lib/errors";
import { validateRequest } from "@/lib/validate-request";
import { updateTicketSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

// GET: fetch ticket details (moderator view)
export const GET = withErrorHandling(
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
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true },
        },
        replies: {
          include: {
            user: {
              select: { id: true, name: true, role: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundError("Ticket");
    }

    return NextResponse.json({ ticket });
  }
);

// PATCH: update ticket status or priority
export const PATCH = withErrorHandling(
  async (req: Request, context?: { params: Promise<Record<string, string>> }) => {
    const session = await getServerSession(authOptions);
    if (!session || !["MODERATOR", "ADMIN"].includes(session.user.role)) {
      throw new AuthError("Unauthorized");
    }

    const params = await context?.params;
    const ticketId = params?.ticketId;

    if (!ticketId) {
      throw new NotFoundError("Ticket");
    }

    const { status, priority } = await validateRequest(req, updateTicketSchema);

    if (!status && !priority) {
      throw new ValidationError("At least one field must be provided");
    }

    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status;
      if (status === "RESOLVED") {
        updateData.resolvedAt = new Date();
      }
    }
    if (priority) updateData.priority = priority;

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
    });

    logger.info({
      ticketId,
      moderatorId: session.user.id,
      changes: updateData,
    }, "Ticket updated by moderator");

    return NextResponse.json({ success: true, ticket });
  }
);
