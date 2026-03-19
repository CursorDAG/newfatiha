import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import LessonRoomClient from "./room-client";
import { generateJitsiToken, getJitsiConfig } from "@/lib/jitsi-jwt";

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
      recordings: {
        where: { status: "READY" },
        select: { id: true },
        take: 1,
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

  // Generate Jitsi JWT token if configured
  const jitsiConfig = getJitsiConfig();
  let jitsiToken: string | undefined;
  let jitsiDomain = "meet.jit.si";

  if (jitsiConfig) {
    jitsiDomain = jitsiConfig.domain;
    jitsiToken = generateJitsiToken(
      lesson.stream.id, // room name
      {
        id: session.user.id,
        name: session.user.name || "Unknown",
        email: session.user.email || "",
        role: isTeacher ? "moderator" : "participant",
      },
      jitsiConfig
    );
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
        hasRecording: lesson.recordings.length > 0,
        quizzes: lesson.quizzes.map((q) => ({
          id: q.id,
          title: q.title,
          type: q.type,
          questions: q.questions.map((qq) => ({
            id: qq.id,
            prompt: qq.prompt,
            type: qq.type,
            options: qq.options
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((o) => ({ id: o.id, text: o.text })),
          })),
        })),
      }}
      viewerRole={session.user.role}
      jitsiDomain={jitsiDomain}
      jitsiToken={jitsiToken}
    />
  );
}

