"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

export default function ConditionalNavbar({
  userName,
  role
}: {
  userName?: string | null;
  role?: string | null;
}) {
  const pathname = usePathname();

  // Don't show Navbar on these routes (they have their own layouts/headers):
  // - Landing page has custom header
  // - Admin pages use AdminLayout with sidebar
  // - Teacher pages use TeacherDashboard with custom UI
  // - Student pages use StudentDashboard with custom UI
  if (
    pathname === "/" ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/teacher") ||
    pathname?.startsWith("/student")
  ) {
    return null;
  }

  return <Navbar userName={userName} role={role} />;
}
