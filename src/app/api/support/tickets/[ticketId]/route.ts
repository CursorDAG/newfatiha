import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, NotFoundError, ForbiddenError } from "@/lib/errors";

// GET: fetch ticket details
export const GET = withErrorHandling(
  async (_req: Request, context?: { params: Promise<Record<string, string>> }) => {
    const session = await getServerSession(authOptions);
    if (!session) {
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

    // Check access: user can only see their own tickets
    if (ticket.userId !== session.user.id) {
      throw new ForbiddenError("Access denied");
    }

    return NextResponse.json({ ticket });
  }
);
