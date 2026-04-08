"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, Users, BookOpen, GraduationCap, LogOut, User, Menu, X } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

type AdminHeaderProps = {
  adminName?: string;
  adminEmail?: string;
};

export default function AdminHeader({ adminName }: AdminHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/admin/dashboard", label: "Дашборд", icon: LayoutDashboard },
    { href: "/admin/users", label: "Пользователи", icon: Users },
    { href: "/admin/courses", label: "Курсы", icon: BookOpen },
    { href: "/admin/teacher-applications", label: "Заявки учителей", icon: GraduationCap },
  ];

  return (
    <header className="bg-emerald-700 text-white shadow-md w-full shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-4">
          {/* Logo — consistent with landing page */}
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
          <nav className="hidden md:flex flex-1 justify-center min-w-0">
            <div className="flex gap-1 bg-emerald-800/50 rounded-xl p-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || pathname?.startsWith(link.href + "/");
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
            </div>
          </nav>

          {/* Right side actions — always shrink-0 so they never get squeezed */}
          <div className="flex-shrink-0 flex items-center gap-2 sm:gap-3 ml-auto">
            <NotificationBell />

            <div className="hidden lg:flex items-center gap-2 text-emerald-100">
              <User className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-medium max-w-[120px] truncate">
                {adminName || "Админ"}
              </span>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-emerald-600/50 transition-colors"
              aria-label="Открыть меню"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

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
              const isActive = pathname === link.href || pathname?.startsWith(link.href + "/");
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
