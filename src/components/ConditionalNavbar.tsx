"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import TeacherHeader from "./dashboard/TeacherHeader";
import StudentHeader from "./dashboard/StudentHeader";
import AdminHeader from "./dashboard/AdminHeader";

export default function ConditionalNavbar({
  userName,
  role,
}: {
  userName?: string | null;
  role?: string | null;
}) {
  const pathname = usePathname();

  // Pages that manage their own header entirely — skip global header
  if (
    pathname === "/" ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/teacher") ||
    pathname?.startsWith("/student")
  ) {
    return null;
  }

  // Authenticated users get their role-specific header on all other pages
  // (e.g. /chat, /notifications, /settings/*, /catalog, /courses, /join/*)
  // This keeps the look identical to the dashboard header.
  if (role === "TEACHER") {
    return <TeacherHeader teacherName={userName ?? undefined} />;
  }

  if (role === "STUDENT") {
    return <StudentHeader studentName={userName ?? undefined} />;
  }

  if (role === "ADMIN") {
    return <AdminHeader adminName={userName ?? undefined} />;
  }

  // Unauthenticated visitors — generic header with login button
  return <Navbar userName={userName} role={role} />;
}
