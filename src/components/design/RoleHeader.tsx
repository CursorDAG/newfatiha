'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Bell, Menu, X, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import type { RoleNavItem } from './RoleSidebar';

interface RoleHeaderProps {
  userName?: string;
  userInitials?: string;
  role: string;
  notificationCount?: number;
  navItems?: RoleNavItem[];
  basePath?: string;
}

export default function RoleHeader({ userName, userInitials, role, notificationCount = 0, navItems, basePath }: RoleHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const searchParams = useSearchParams();
  const initials = userInitials ?? userName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? 'АМ';
  const base = basePath ?? (role === 'STUDENT' ? '/student' : role === 'TEACHER' || role === 'ADMIN' ? '/teacher' : '/');
  const items = navItems ?? [];
  const activeTab = searchParams.get('tab') ?? items[0]?.tab;

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-[#06201A]/80 backdrop-blur-xl border-b border-white/5">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* ── Mobile: hamburger button (полное меню вкладок) ─── */}
          <button
            type="button"
            aria-label="Открыть меню"
            onClick={() => setIsOpen(true)}
            className="group inline-flex items-center justify-center rounded-lg p-2 text-white/60 transition hover:text-[#D4AF37] lg:hidden"
          >
            <Menu className="h-6 w-6 transition-colors duration-300" strokeWidth={1.3} />
          </button>

          {/* ── Desktop: spacer (навигацию ведёт левый сайдбар) ── */}
          <div className="hidden lg:block" />

          {/* ── Logo (mobile center) ─── */}
          <Link href={base} className="lg:hidden flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D4AF37] to-[#8C6D1F]">
              <span className="text-sm font-bold text-[#06201A]">ف</span>
            </div>
            <span className="text-base font-bold text-white">Fatiha.ru</span>
          </Link>

          {/* ── Right-side controls ─── */}
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" strokeWidth={1.3} />
              <input
                type="text"
                placeholder="Поиск..."
                className="h-9 w-48 lg:w-56 rounded-full bg-white/[0.03] border border-white/5 pl-9 pr-4 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#D4AF37]/40 focus:ring-1 focus:ring-[#D4AF37]/30"
              />
            </div>

            <button
              type="button"
              aria-label="Уведомления"
              className="group relative rounded-lg p-2 text-white/60 transition hover:text-[#D4AF37]"
            >
              <Bell className="h-5 w-5 transition-colors duration-300" strokeWidth={1.3} />
              {notificationCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#D4AF37] text-[9px] font-bold text-[#06201A]">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>

            {/* Выход и настройки — только на десктопе; на мобильном они в drawer */}
            <button
              type="button"
              aria-label="Выйти"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="hidden lg:inline-flex rounded-lg p-2 text-white/60 transition hover:text-[#D4AF37]"
            >
              <LogOut className="h-5 w-5" strokeWidth={1.3} />
            </button>

            <Link
              href="/settings"
              className="hidden lg:flex h-9 w-9 items-center justify-center rounded-full border border-[#D4AF37]/40 bg-white/[0.05] text-xs font-semibold text-white transition hover:border-[#D4AF37] hover:bg-white/[0.1]"
            >
              {initials}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer overlay ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ── Mobile drawer: полный список вкладок ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-[#06201A] border-r border-white/5 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/5 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D4AF37] to-[#8C6D1F]">
              <span className="text-lg font-bold text-[#06201A]">ف</span>
            </div>
            <span className="text-lg font-semibold text-white font-serif">Fatiha.ru</span>
          </div>
          <button
            type="button"
            aria-label="Закрыть меню"
            onClick={() => setIsOpen(false)}
            className="group rounded-lg p-2 text-white/60 transition hover:text-[#D4AF37]"
          >
            <X className="h-5 w-5 transition-colors duration-300" strokeWidth={1.3} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
          {items.map(({ id, label, tab, icon: Icon }) => {
            const isActive = activeTab === tab;
            return (
              <Link
                key={id}
                href={`${base}?tab=${tab}`}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition"
                style={{
                  color: isActive ? '#D4AF37' : 'rgba(255,255,255,0.6)',
                  backgroundColor: isActive ? 'rgba(212,175,55,0.1)' : undefined,
                }}
              >
                <Icon size={18} strokeWidth={1.3} style={{ color: isActive ? '#D4AF37' : undefined }} />
                {label}
              </Link>
            );
          })}
          <div className="mt-4 border-t border-white/5 pt-4">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm font-medium text-white/60 transition hover:bg-white/[0.03] hover:text-[#D4AF37]"
            >
              Настройки
            </Link>
            <button
              onClick={() => { setIsOpen(false); signOut({ callbackUrl: '/' }); }}
              className="w-full rounded-lg px-4 py-3 text-sm font-medium text-white/60 transition hover:bg-white/[0.03] hover:text-red-400 text-left"
            >
              Выйти
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
}
