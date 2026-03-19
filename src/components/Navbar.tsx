"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import NotificationBell from "./NotificationBell";

export default function Navbar({ userName, role }: { userName?: string | null; role?: string | null }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isTeacher = role === "TEACHER" || role === "ADMIN";
  const isStudent = role === "STUDENT";
  const isAuthenticated = !!role;

  const teacherLinks = [
    { href: "/teacher", label: "Мои курсы" },
    { href: "/teacher/schedule", label: "Расписание" },
    { href: "/chat", label: "Чат" },
    { href: "/notifications", label: "Уведомления" },
    { href: "/settings/notifications", label: "Настройки уведомлений" },
    { href: "/teacher/settings", label: "Настройки" },
  ];

  const studentLinks = [
    { href: "/student", label: "Мои потоки" },
    { href: "/chat", label: "Чат" },
    { href: "/notifications", label: "Уведомления" },
    { href: "/settings/notifications", label: "Настройки уведомлений" },
    { href: "#", label: "ДЗ" },
    { href: "#", label: "Расписание" },
  ];

  const links = isTeacher ? teacherLinks : (isStudent ? studentLinks : []);

  return (
    <header className="bg-emerald-700 text-white shadow-md w-full shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-lg sm:text-xl font-bold tracking-tight hover:text-emerald-100 transition-colors">
              Fatiha.ru
              {isAuthenticated && (
                <span className="text-emerald-200 text-xs sm:text-sm font-normal ml-2 hidden sm:inline">
                  {isTeacher ? "Teacher Portal" : "Student Portal"}
                </span>
              )}
            </Link>
          </div>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <nav className="hidden md:flex gap-1 bg-emerald-800/50 rounded-xl p-1">
              {links.map((link) => {
                const isActive = pathname === link.href || (link.href !== "#" && pathname.startsWith(link.href) && link.href !== "/teacher" && link.href !== "/student");
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={`px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-semibold transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-white text-emerald-800 shadow-sm"
                        : "text-emerald-100 hover:text-white hover:bg-emerald-600/50"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right side actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {isAuthenticated ? (
              <>
                <NotificationBell />
                <span className="text-xs sm:text-sm font-medium text-emerald-100 hidden lg:block max-w-[120px] truncate">{userName}</span>

                {/* Mobile menu button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg hover:bg-emerald-600/50 transition-colors"
                  aria-label="Открыть меню"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {mobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>

                {/* Desktop logout */}
                <Link
                  href="/api/auth/signout"
                  className="hidden md:block text-emerald-200 hover:text-white text-sm font-medium transition-colors whitespace-nowrap"
                >
                  Выйти →
                </Link>
              </>
            ) : (
              <>
                {pathname !== '/' && (
                  <Link
                    href="/"
                    className="text-emerald-200 hover:text-white text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    На главную
                  </Link>
                )}
                <Link
                  href="/api/auth/signin"
                  className="bg-white text-emerald-800 font-bold px-3 sm:px-5 py-2 rounded-xl text-xs sm:text-sm hover:bg-emerald-50 transition-all shadow-sm"
                >
                  Войти
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {isAuthenticated && mobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-2 space-y-2">
            {links.map((link) => {
              const isActive = pathname === link.href || (link.href !== "#" && pathname.startsWith(link.href) && link.href !== "/teacher" && link.href !== "/student");
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-white text-emerald-800 shadow-sm"
                      : "text-emerald-100 hover:text-white hover:bg-emerald-600/50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/api/auth/signout"
              className="block px-4 py-3 rounded-lg text-sm font-semibold text-red-300 hover:text-white hover:bg-red-600/50 transition-all"
            >
              Выйти →
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
