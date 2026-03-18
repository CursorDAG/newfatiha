import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError } from "@/lib/errors";
import { z } from "zod";
import { validateQuery } from "@/lib/validate-request";

const querySchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignedToId: z.string().uuid().optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().int().min(0)).optional(),
});

// GET: fetch all support tickets (moderator view)
export const GET = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || !["MODERATOR", "ADMIN"].includes(session.user.role)) {
    throw new AuthError("Unauthorized");
  }

  const query = validateQuery(req, querySchema);

  const where: Record<string, unknown> = {};
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.assignedToId) where.assignedToId = query.assignedToId;

  const tickets = await prisma.supportTicket.findMany({
    where,
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      assignedTo: {
        select: { id: true, name: true },
      },
      _count: {
        select: { replies: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: query.limit || 50,
    skip: query.offset || 0,
  });

  return NextResponse.json({ tickets });
});
