'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, BookOpen, Users, type LucideIcon } from 'lucide-react';

/** Один пункт навигации дашборда. tab → значение ?tab= */
export type RoleNavItem = {
  id: string;
  label: string;
  tab: string;
  icon: LucideIcon | React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
};

interface RoleSidebarProps {
  role: string;
  userName?: string;
  userInitials?: string;
  /** Полный список вкладок дашборда (источник навигации) */
  navItems?: RoleNavItem[];
  /** Базовый путь дашборда (/student или /teacher) */
  basePath?: string;
}

const FALLBACK_NAV: RoleNavItem[] = [
  { id: 'home', label: 'Главная', tab: 'home', icon: LayoutDashboard },
  { id: 'courses', label: 'Курсы', tab: 'courses', icon: BookOpen },
  { id: 'about', label: 'О платформе', tab: 'about', icon: Users },
];

export default function RoleSidebar({ role, userName, userInitials, navItems, basePath }: RoleSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const items = navItems && navItems.length > 0 ? navItems : FALLBACK_NAV;
  const base = basePath ?? (role === 'STUDENT' ? '/student' : role === 'TEACHER' || role === 'ADMIN' ? '/teacher' : '/');
  const activeTab = searchParams.get('tab') ?? items[0]?.tab;
  const initials = userInitials ?? userName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? 'АМ';

  return (
    <aside
      className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[280px] flex-col glass border-r border-white/5"
      style={{ backgroundColor: 'var(--bg-sidebar)' }}
    >
      {/* ── Logo / Branding ─────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-8">
        <Link href={base} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D4AF37] to-[#8C6D1F] shadow-lg shadow-amber-500/10">
          <span className="text-xl font-bold text-[#06201A] leading-none select-none">ف</span>
        </Link>

        <div className="flex flex-col">
          <Link href={base}>
            <span className="text-lg font-bold tracking-wide font-serif" style={{ color: 'var(--text-cream)' }}>
              Fatiha.ru
            </span>
          </Link>
          <span className="text-xs text-white/40">{userName ?? 'Гость'}</span>
        </div>
      </div>

      {/* ── Navigation Links ────────────────────────────── */}
      <nav className="flex-1 space-y-1 px-3 overflow-y-auto pb-4">
        {items.map(({ id, label, tab, icon: Icon }) => {
          const isActive = activeTab === tab;
          return (
            <Link
              key={id}
              href={`${base}?tab=${tab}`}
              className={`sidebar-link group flex w-full items-center gap-3.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive ? 'active' : ''
              }`}
              style={{
                color: isActive ? 'var(--gold)' : 'rgba(255, 255, 255, 0.6)',
                backgroundColor: isActive ? 'rgba(212, 175, 55, 0.12)' : undefined,
              }}
            >
              <Icon
                size={18}
                strokeWidth={1.3}
                className="shrink-0 transition-colors duration-300 text-white/60 group-hover:text-[#D4AF37]"
                style={{ color: isActive ? '#D4AF37' : undefined }}
              />
              <span className="transition-colors duration-200 group-hover:text-white">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ── User Avatar ────────────────────────────────── */}
      <div className="px-6 py-4 border-t border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D4AF37]/40 bg-white/[0.05] text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName ?? 'Пользователь'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
