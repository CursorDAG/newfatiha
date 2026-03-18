import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const topic = url.searchParams.get("topic");
  const level = url.searchParams.get("level");

  const templates = await prisma.lesson.findMany({
    where: {
      isTemplate: true,
      ...(topic ? { topic: { contains: topic, mode: "insensitive" } } : {}),
      ...(level ? { level: { equals: level } } : {}),
    },
    orderBy: [{ level: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      type: true,
      content: true,
      topic: true,
      level: true,
      quizzes: {
        select: {
          id: true,
          title: true,
          type: true,
          questions: {
            select: {
              id: true,
              prompt: true,
              sortOrder: true,
              options: {
                select: {
                  id: true,
                  text: true,
                  isCorrect: true,
                  sortOrder: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ success: true, templates });
}

