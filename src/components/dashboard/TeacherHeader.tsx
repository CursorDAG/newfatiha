"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BookOpen, Calendar, MessageSquare, Bell, Settings, BellRing,
  LogOut, User, Menu, X,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

type TeacherHeaderProps = {
  teacherName?: string;
  teacherEmail?: string;
};

export default function TeacherHeader({ teacherName }: TeacherHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/teacher",                    label: "Мои курсы",           icon: BookOpen },
    { href: "/teacher/schedule",           label: "Расписание",          icon: Calendar },
    { href: "/chat",                       label: "Чат",                 icon: MessageSquare },
    { href: "/notifications",              label: "Уведомления",         icon: Bell },
    { href: "/settings/notifications",     label: "Настройки уведомлений",  icon: BellRing },
    { href: "/teacher/settings",           label: "Настройки",           icon: Settings },
  ];

  return (
    <header className="bg-emerald-700 text-white shadow-md w-full shrink-0">
      <div className="w-full px-4 sm:px-8 py-3">
        <div className="flex items-center gap-3">
          {/* Mobile sidebar toggle (teacher tabs) */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("teacher-shell-toggle-sidebar"))}
            className="lg:hidden min-h-11 min-w-11 -ml-2 rounded-lg hover:bg-emerald-600/50 transition-colors flex items-center justify-center"
            aria-label="Открыть вкладки"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity min-h-11">
              <span className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-700 border border-white/20 rounded-xl flex items-center justify-center text-white text-base font-bold shadow-md">
                ف
              </span>
              <span className="text-base font-extrabold tracking-tight hidden sm:block">
                Fatiha<span className="text-emerald-200">.ru</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex flex-1 justify-center min-w-0">
            <div className="flex gap-0.5 bg-emerald-800/50 rounded-xl p-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/teacher" && pathname?.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    title={link.label}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      isActive
                        ? "bg-white text-emerald-800 shadow-sm"
                        : "text-emerald-100 hover:text-white hover:bg-emerald-600/50"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden lg:inline">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Right side */}
          <div className="flex-shrink-0 flex items-center gap-2 ml-auto">
            <NotificationBell />

            <span className="text-xs font-medium text-emerald-100 hidden xl:block max-w-[110px] truncate">
              {teacherName || "Учитель"}
            </span>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden min-h-11 min-w-11 rounded-lg hover:bg-emerald-600/50 transition-colors flex items-center justify-center"
              aria-label="Открыть меню"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="hidden md:flex items-center gap-1.5 text-emerald-200 hover:text-white text-xs font-medium transition-colors whitespace-nowrap"
              title="Выйти"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Выйти</span>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden mt-3 pb-2 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                pathname === link.href ||
                (link.href !== "/teacher" && pathname?.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 min-h-11 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-normal leading-snug ${
                    isActive
                      ? "bg-white text-emerald-800 shadow-sm"
                      : "text-emerald-100 hover:text-white hover:bg-emerald-600/50"
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {link.label}
                </Link>
              );
            })}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full flex items-center gap-3 px-4 min-h-11 py-2.5 rounded-lg text-sm font-semibold text-red-300 hover:text-white hover:bg-red-600/50 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Выйти
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
