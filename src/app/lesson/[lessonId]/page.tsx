import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import LessonRoomClient from "./room-client";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect(`/api/auth/signin?callbackUrl=/lesson/${lessonId}`);

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      stream: {
        include: {
          course: true,
          enrollments: {
            where: { userId: session.user.id, status: "ACTIVE" },
            select: { id: true },
          },
        },
      },
      quizzes: {
        include: {
          questions: {
            include: { options: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!lesson) redirect("/student");

  const isTeacher = session.user.role === "TEACHER" || session.user.role === "ADMIN";
  const isEnrolled = lesson.stream.enrollments.length > 0;
  if (!isTeacher && !isEnrolled) redirect("/unauthorized");

  // Students cannot access unpublished lessons
  if (!isTeacher && !lesson.published) {
    notFound();
  }

  return (
    <LessonRoomClient
      lesson={{
        id: lesson.id,
        title: lesson.title,
        type: lesson.type,
        content: lesson.content,
        streamId: lesson.streamId,
        streamName: lesson.stream.name,
        courseName: lesson.stream.course.title,
        jitsiRoomName: lesson.stream.id,
        quizzes: lesson.quizzes.map((q) => ({
          id: q.id,
          title: q.title,
          type: q.type,
          questions: q.questions.map((qq) => ({
            id: qq.id,
            prompt: qq.prompt,
            options: qq.options
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((o) => ({ id: o.id, text: o.text })),
          })),
        })),
      }}
      viewerRole={session.user.role}
    />
  );
}

