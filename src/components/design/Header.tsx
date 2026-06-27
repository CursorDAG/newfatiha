'use client';

import { useState } from 'react';
import { Search, Bell, Menu, X } from 'lucide-react';

/** Navigation links for the LMS dashboard */
const navLinks = [
  { label: 'Курсы', href: '#courses' },
  { label: 'Библиотека', href: '#library' },
  { label: 'Сообщество', href: '#community' },
  { label: 'Время намаза', href: '#prayer-times' },
  { label: 'О нас', href: '#about' },
  { label: 'Контакты', href: '#contacts' },
];

/**
 * Header — Premium LMS dashboard top navigation bar.
 */
export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-[#06201A]/80 backdrop-blur-xl border-b border-white/5">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* ── Mobile: hamburger button ─────────────────────────── */}
        <button
          type="button"
          aria-label="Открыть меню"
          onClick={() => setIsOpen(true)}
          className="group inline-flex items-center justify-center rounded-lg p-2 text-white/60 transition hover:text-[#D4AF37] lg:hidden"
        >
          <Menu className="h-6 w-6 transition-colors duration-300" strokeWidth={1.3} />
        </button>

        {/* ── Desktop: navigation links ───────────────────────── */}
        <nav className="hidden lg:flex lg:items-center lg:gap-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-white/60 transition-all duration-300 hover:text-[#D4AF37] hover:bg-white/[0.03]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* ── Right-side controls ─────────────────────────────── */}
        <div className="flex items-center gap-4">
          {/* Search bar — hidden on mobile */}
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40 transition-colors duration-300" strokeWidth={1.3} />
            <input
              type="text"
              placeholder="Поиск..."
              className="h-9 w-56 rounded-full bg-white/[0.03] border border-white/5 pl-9 pr-4 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#D4AF37]/40 focus:ring-1 focus:ring-[#D4AF37]/30"
            />
          </div>

          {/* Notification bell with gold dot badge */}
          <button
            type="button"
            aria-label="Уведомления"
            className="group relative rounded-lg p-2 text-white/60 transition hover:text-[#D4AF37]"
          >
            <Bell className="h-5 w-5 transition-colors duration-300" strokeWidth={1.3} />
            {/* Gold notification dot */}
            <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-[#D4AF37] ring-1 ring-[#06201A]" />
          </button>

          {/* User avatar circle with initials */}
          <button
            type="button"
            aria-label="Профиль пользователя"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D4AF37]/40 bg-white/[0.05] text-xs font-semibold text-white transition hover:border-[#D4AF37] hover:bg-white/[0.1]"
          >
            АМ
          </button>
        </div>
      </div>
      </header>

      {/* ── Mobile drawer overlay (вне <header> чтобы backdrop-filter
            родителя не создавал containing block для fixed-элементов) ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ── Mobile slide-in drawer ──────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-[#06201A] border-r border-white/5 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex h-16 items-center justify-between border-b border-white/5 px-4">
          <span className="text-lg font-semibold text-white font-serif">Меню</span>
          <button
            type="button"
            aria-label="Закрыть меню"
            onClick={() => setIsOpen(false)}
            className="group rounded-lg p-2 text-white/60 transition hover:text-[#D4AF37]"
          >
            <X className="h-5 w-5 transition-colors duration-300" strokeWidth={1.3} />
          </button>
        </div>

        {/* Drawer navigation links */}
        <nav className="flex flex-col gap-1.5 p-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="rounded-lg px-4 py-3 text-sm font-medium text-white/60 transition hover:bg-white/[0.03] hover:text-[#D4AF37]"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </aside>
    </>
  );
}
