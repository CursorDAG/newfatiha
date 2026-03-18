import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { QuizType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const {
    lessonId,
    title,
    type,
    prompt,
    options,
    correctOptionIndex,
  }: {
    lessonId?: string;
    title?: string;
    type?: QuizType;
    prompt?: string;
    options?: string[];
    correctOptionIndex?: number;
  } = body;

  if (!lessonId) return NextResponse.json({ error: "lessonId is required" }, { status: 400 });
  if (!title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!type || !Object.values(QuizType).includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  if (!prompt?.trim()) return NextResponse.json({ error: "prompt is required" }, { status: 400 });

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { stream: true },
  });
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  if (session.user.role !== "ADMIN" && lesson.stream.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (type === "MULTIPLE_CHOICE") {
    const cleaned = (options ?? []).map((s) => (s ?? "").trim()).filter(Boolean);
    if (cleaned.length < 2) return NextResponse.json({ error: "At least 2 options required" }, { status: 400 });
    if (typeof correctOptionIndex !== "number" || correctOptionIndex < 0 || correctOptionIndex >= cleaned.length) {
      return NextResponse.json({ error: "correctOptionIndex is invalid" }, { status: 400 });
    }

    const quiz = await prisma.lessonQuiz.create({
      data: {
        lessonId,
        title: title.trim(),
        type,
        questions: {
          create: {
            prompt: prompt.trim(),
            sortOrder: 0,
            options: {
              create: cleaned.map((text, idx) => ({
                text,
                isCorrect: idx === correctOptionIndex,
                sortOrder: idx,
              })),
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, quizId: quiz.id });
  }

  const quiz = await prisma.lessonQuiz.create({
    data: {
      lessonId,
      title: title.trim(),
      type,
      questions: {
        create: {
          prompt: prompt.trim(),
          sortOrder: 0,
        },
      },
    },
  });

  return NextResponse.json({ success: true, quizId: quiz.id });
}

