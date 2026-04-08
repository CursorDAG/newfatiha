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

  // Landing page has its own custom header
  if (pathname === "/") return null;

  // Admin pages manage their own header inside AdminLayout (sidebar layout)
  if (pathname?.startsWith("/admin")) return null;

  // All other pages — use role-specific header from root layout so it
  // is a SINGLE persistent instance and never jumps on navigation.
  if (role === "TEACHER") return <TeacherHeader teacherName={userName ?? undefined} />;
  if (role === "STUDENT") return <StudentHeader studentName={userName ?? undefined} />;
  if (role === "ADMIN")   return <AdminHeader   adminName={userName ?? undefined} />;

  // Unauthenticated visitors
  return <Navbar userName={userName} role={role} />;
}
