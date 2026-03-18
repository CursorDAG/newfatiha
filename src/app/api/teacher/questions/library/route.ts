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
  const q = url.searchParams.get("q");

  const questions = await prisma.lessonQuizQuestion.findMany({
    where: {
      ...(q
        ? {
            prompt: {
              contains: q,
              mode: "insensitive",
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      prompt: true,
      quiz: {
        select: {
          id: true,
          title: true,
          type: true,
        },
      },
      options: {
        select: {
          id: true,
          text: true,
          isCorrect: true,
        },
      },
    },
    take: 100,
  });

  return NextResponse.json({ success: true, questions });
});

