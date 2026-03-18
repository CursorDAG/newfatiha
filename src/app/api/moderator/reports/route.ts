import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError } from "@/lib/errors";
import { z } from "zod";
import { validateQuery } from "@/lib/validate-request";

const querySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  contentType: z.enum(["LESSON", "QUIZ", "HOMEWORK", "CHAT_MESSAGE"]).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().int().min(0)).optional(),
});

// GET: fetch all content reports (moderator view)
export const GET = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || !["MODERATOR", "ADMIN"].includes(session.user.role)) {
    throw new AuthError("Unauthorized");
  }

  const query = validateQuery(req, querySchema);

  const where: Record<string, unknown> = {};
  if (query.status) where.status = query.status;
  if (query.contentType) where.contentType = query.contentType;

  const reports = await prisma.contentReport.findMany({
    where,
    include: {
      reporter: {
        select: { id: true, name: true, email: true },
      },
      reviewedBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: query.limit || 50,
    skip: query.offset || 0,
  });

  return NextResponse.json({ reports });
});
