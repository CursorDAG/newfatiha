'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  Calendar,
} from 'lucide-react';

/** Custom SVG Icon representing an open Quran on a Rehal stand */
function QuranIcon({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Arched open pages */}
      <path d="M12 6c-1.5-1.8-4.5-2-6.5-1v10.5c2-1 5-0.8 6.5 1 1.5-1.8 4.5-2 6.5-1V5c-2-1-5-0.8-6.5 1z" />
      {/* Center binder */}
      <path d="M12 6v10.5" />
      {/* Rehal support stand (X-legs at bottom) */}
      <path d="M5.5 18.5l4-3M18.5 18.5l-4-3" />
      <path d="M7.5 19.5l9-7M16.5 19.5l-9-7" opacity="0.4" />
    </svg>
  );
}

/** Navigation item definition */
interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
}

/** Sidebar navigation items — localized in Russian with no emojis */
const navItems: NavItem[] = [
  { id: 'dashboard',  label: 'Панель управления', icon: LayoutDashboard },
  { id: 'courses',    label: 'Мои курсы',         icon: GraduationCap },
  { id: 'schedule',   label: 'Расписание',        icon: Calendar },
  { id: 'quran',      label: 'Изучение Корана',   icon: QuranIcon },
];

/**
 * Sidebar — fixed left navigation panel for the Fatiha.ru LMS dashboard.
 */
export default function Sidebar() {
  const [activeId, setActiveId] = useState<string>('dashboard');

  return (
    <aside
      className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[280px] flex-col glass border-r border-white/5"
      style={{ backgroundColor: 'var(--bg-sidebar)' }}
    >
      {/* ── Logo / Branding ─────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-8">
        {/* Arabic ف mark inside a golden gradient circle */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D4AF37] to-[#8C6D1F] shadow-lg shadow-amber-500/10">
          <span className="text-xl font-bold text-[#06201A] leading-none select-none">
            ف
          </span>
        </div>

        {/* Site name */}
        <div className="flex flex-col">
          <span
            className="text-lg font-bold tracking-wide font-serif"
            style={{ color: 'var(--text-cream)' }}
          >
            Fatiha.ru
          </span>
          <span className="text-xs text-white/40">Исламское образование</span>
        </div>
      </div>

      {/* ── Navigation Links ────────────────────────────── */}
      <nav className="flex-1 space-y-1.5 px-3 overflow-y-auto">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeId === id;

          return (
            <button
              key={id}
              onClick={() => setActiveId(id)}
              className={`sidebar-link group flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                isActive ? 'active' : ''
              }`}
              style={{
                color: isActive ? 'var(--gold)' : 'rgba(255, 255, 255, 0.6)',
              }}
            >
              {/* Thin stroke Lucide or Custom icon */}
              <Icon
                size={18}
                strokeWidth={1.3}
                className="shrink-0 transition-colors duration-300 text-white/60 group-hover:text-[#D4AF37] group-[.active]:text-[#D4AF37]"
              />

              {/* Label */}
              <span className="transition-colors duration-200 group-hover:text-white group-[.active]:text-[#D4AF37]">
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── Decorative SVG Arch with Glow ───────────────── */}
      <div className="relative mt-auto px-4 pb-6">
        <svg
          className="glow-arch mx-auto"
          width="220"
          height="80"
          viewBox="0 0 220 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Outer arch stroke */}
          <path
            d="M10 70 Q110 0 210 70"
            stroke="url(#archGradient)"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Inner subtle arch */}
          <path
            d="M30 70 Q110 15 190 70"
            stroke="url(#archGradient)"
            strokeWidth="0.8"
            strokeLinecap="round"
            fill="none"
            opacity="0.3"
          />
          <defs>
            <linearGradient id="archGradient" x1="0" y1="0" x2="220" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#d4af37" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#d4af37" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#d4af37" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </aside>
  );
}
