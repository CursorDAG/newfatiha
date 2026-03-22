"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Home, BookOpen, FileText, Calendar, LogOut, User, Menu, X } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

type StudentHeaderProps = {
  studentName?: string;
  studentEmail?: string;
};

export default function StudentHeader({ studentName, studentEmail }: StudentHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/student", label: "Главная", icon: Home },
    { href: "/student/lessons", label: "Уроки", icon: BookOpen },
    { href: "/student/homework", label: "Д/З", icon: FileText },
    { href: "/student/schedule", label: "Расписание", icon: Calendar },
  ];

  return (
    <header className="bg-emerald-700 text-white shadow-md w-full shrink-0">
      <div className="w-full px-8 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/student" className="text-lg sm:text-xl font-bold tracking-tight hover:text-emerald-100 transition-colors">
              Fatiha.ru
              <span className="text-emerald-200 text-xs sm:text-sm font-normal ml-2 hidden sm:inline">
                Student Portal
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-1 bg-emerald-800/50 rounded-xl p-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== "/student" && pathname?.startsWith(link.href));
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                    isActive
                      ? "bg-white text-emerald-800 shadow-sm"
                      : "text-emerald-100 hover:text-white hover:bg-emerald-600/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <NotificationBell />

            {/* Profile info */}
            <div className="hidden lg:flex items-center gap-2 text-emerald-100">
              <User className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-medium max-w-[120px] truncate">
                {studentName || "Студент"}
              </span>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-emerald-600/50 transition-colors"
              aria-label="Открыть меню"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>

            {/* Desktop logout button */}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="hidden md:flex items-center gap-2 text-emerald-200 hover:text-white text-sm font-medium transition-colors whitespace-nowrap"
              title="Выйти"
            >
              <LogOut className="w-4 h-4" />
              <span>Выйти</span>
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-2 space-y-2 relative z-30">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== "/student" && pathname?.startsWith(link.href));
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-white text-emerald-800 shadow-sm"
                      : "text-emerald-100 hover:text-white hover:bg-emerald-600/50"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {link.label}
                </Link>
              );
            })}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-red-300 hover:text-white hover:bg-red-600/50 transition-all"
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
