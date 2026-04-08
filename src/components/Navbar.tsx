"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import NotificationBell from "./NotificationBell";

export default function Navbar({ userName, role }: { userName?: string | null; role?: string | null }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = role === "ADMIN";
  const isTeacher = role === "TEACHER";
  const isStudent = role === "STUDENT";
  const isAuthenticated = !!role;

  // Determine dashboard link based on role
  const dashboardLink = isAdmin ? "/admin" : isTeacher ? "/teacher" : isStudent ? "/student" : "/";

  const adminLinks = [
    { href: "/admin/dashboard", label: "Дашборд" },
    { href: "/admin/users", label: "Пользователи" },
    { href: "/admin/courses", label: "Курсы" },
    { href: "/admin/teacher-applications", label: "Заявки учителей" },
  ];

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

  const links = isAdmin ? adminLinks : isTeacher ? teacherLinks : isStudent ? studentLinks : [];

  return (
    <header className="bg-emerald-700 text-white shadow-md w-full shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-4">
          {/* Logo — matches landing page style */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <span className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-700 border border-white/20 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-md">
                ف
              </span>
              <span className="text-lg sm:text-xl font-extrabold tracking-tight">
                Fatiha<span className="text-emerald-200">.ru</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation — centred, takes available space */}
          {isAuthenticated && (
            <nav className="hidden md:flex flex-1 justify-center min-w-0">
              <div className="flex gap-1 bg-emerald-800/50 rounded-xl p-1">
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
              </div>
            </nav>
          )}

          {/* Right side actions — always shrink-0 so they never get squeezed */}
          <div className="flex-shrink-0 flex items-center gap-2 sm:gap-3 ml-auto">
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
                  {mobileMenuOpen ? (
                    <X className="w-6 h-6" />
                  ) : (
                    <Menu className="w-6 h-6" />
                  )}
                </button>

                {/* Desktop: Link to dashboard */}
                <Link
                  href={dashboardLink}
                  className="hidden md:block bg-white text-emerald-800 font-bold px-3 sm:px-5 py-2 rounded-xl text-xs sm:text-sm hover:bg-emerald-50 transition-all shadow-sm"
                >
                  Кабинет
                </Link>

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
                {pathname !== "/" && (
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
