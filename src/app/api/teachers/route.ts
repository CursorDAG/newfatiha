import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";

export const GET = withErrorHandling(async () => {
  const teachers = await prisma.user.findMany({
    where: {
      role: {
        in: ["TEACHER", "ADMIN"],
      },
      isBlocked: false,
    },
    select: {
      id: true,
      name: true,
      avatar: true,
      bio: true,
      skills: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return NextResponse.json(teachers);
});
