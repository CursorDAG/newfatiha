import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError } from "@/lib/errors";

export const GET = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    throw new AuthError("Unauthorized");
  }

  const url = new URL(req.url);
  const streamId = url.searchParams.get("streamId") ?? undefined;

  const slots = await prisma.streamScheduleSlot.findMany({
    where: {
      stream: { teacherId: session.user.id },
      ...(streamId ? { streamId } : {}),
    },
    include: {
      stream: { select: { id: true, name: true, color: true } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }],
  });

  return NextResponse.json({
    success: true,
    slots: slots.map((s) => ({
      id: s.id,
      streamId: s.streamId,
      streamName: s.stream.name,
      streamColor: s.stream.color,
      dayOfWeek: s.dayOfWeek,
      startMinutes: s.startMinutes,
      durationMinutes: s.durationMinutes,
    })),
  });
});

