import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import TeacherSettingsPage from "@/components/teacher/TeacherSettingsPage";

export const metadata = { title: "Настройки — Fatiha.ru" };

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (
    !session?.user?.id ||
    (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")
  ) {
    redirect("/auth/signin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      avatar: true,
      bio: true,
      skills: true,
    },
  });

  if (!user) redirect("/auth/signin");

  return (
    <TeacherSettingsPage
      userId={user.id}
      userName={user.name}
      userEmail={user.email}
      userRole={user.role}
      createdAt={user.createdAt.toISOString()}
      avatar={user.avatar ?? null}
      bio={user.bio ?? null}
      skills={user.skills}
    />
  );
}
