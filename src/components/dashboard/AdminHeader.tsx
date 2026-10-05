"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut, Menu, Search } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

type AdminHeaderProps = {
  adminName?: string;
  adminEmail?: string;
};

export default function AdminHeader({ adminName }: AdminHeaderProps) {

  // Navigation moved to sidebar only — no duplication

  return (
    <header className="bg-emerald-700 text-white shadow-md w-full shrink-0">
      <div className="w-full px-4 sm:px-8 py-3">
        <div className="flex items-center gap-3">
          {/* Sidebar toggle — visible on <lg where admin sidebar is collapsed */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("admin-layout-toggle-sidebar"))}
            className="lg:hidden p-1.5 rounded-lg hover:bg-emerald-600/50 transition-colors -ml-1"
            aria-label="Открыть меню админки"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <span className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-700 border border-white/20 rounded-xl flex items-center justify-center text-white text-base font-bold shadow-md">
                ف
              </span>
              <span className="text-base font-extrabold tracking-tight hidden sm:block">
                Fatiha<span className="text-emerald-200">.ru</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation removed — use sidebar instead */}
          <div className="flex-1" />

          {/* Right side */}
          <div className="flex-shrink-0 flex items-center gap-2 ml-auto">
            {/* Search button */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-global-search"))}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/50 hover:bg-emerald-600 rounded-lg transition-colors text-sm"
              title="Поиск (Ctrl+K)"
            >
              <Search className="w-4 h-4" />
              <span className="hidden lg:inline text-emerald-100">Поиск</span>
              <kbd className="hidden xl:inline-block px-1.5 py-0.5 text-xs bg-emerald-800/50 rounded border border-emerald-600">
                ⌘K
              </kbd>
            </button>

            <NotificationBell />

            <span className="text-xs font-medium text-emerald-100 hidden xl:block max-w-[110px] truncate">
              {adminName || "Админ"}
            </span>

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

        {/* Mobile menu removed — use sidebar instead */}
      </div>
    </header>
  );
}
