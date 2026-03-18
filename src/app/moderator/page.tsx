import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import ModeratorClient from "./moderator-client";

export default async function ModeratorPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  if (!["MODERATOR", "ADMIN"].includes(session.user.role)) {
    redirect("/");
  }

  return <ModeratorClient />;
}
