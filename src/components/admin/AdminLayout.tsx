"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  FileEdit,
  Megaphone,
  Settings,
} from "lucide-react";
import AdminHeader from "@/components/dashboard/AdminHeader";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Пользователи", icon: Users },
  { href: "/admin/teacher-applications", label: "Заявки учителей", icon: GraduationCap },
  { href: "/admin/courses", label: "Курсы", icon: BookOpen },
  { href: "/admin/cms", label: "CMS", icon: FileEdit },
  { href: "/admin/broadcasts", label: "Рассылки", icon: Megaphone },
  { href: "/admin/settings", label: "Настройки", icon: Settings },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <AdminHeader
        adminName={session?.user?.name || undefined}
        adminEmail={session?.user?.email || undefined}
      />

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-6 border-b border-slate-200">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-md">
                ف
              </span>
              <div>
                <span className="text-xl font-extrabold text-slate-800 tracking-tight block">
                  Fatiha<span className="text-emerald-600">.ru</span>
                </span>
                <span className="text-xs text-slate-500 font-medium">Админ-панель</span>
              </div>
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              ← На главную
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
