import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import TeacherSchedulePage from "@/components/TeacherSchedulePage";

export default async function TeacherSchedule() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    redirect("/api/auth/signin");
  }

  return <TeacherSchedulePage />;
}

