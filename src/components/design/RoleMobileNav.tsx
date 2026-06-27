'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, BookOpen, User } from 'lucide-react';
import type { RoleNavItem } from './RoleSidebar';

interface RoleMobileNavProps {
  role: string;
  navItems?: RoleNavItem[];
  basePath?: string;
}

const FALLBACK: RoleNavItem[] = [
  { id: 'home', label: 'Главная', tab: 'home', icon: LayoutDashboard },
  { id: 'courses', label: 'Курсы', tab: 'courses', icon: BookOpen },
  { id: 'profile', label: 'Профиль', tab: 'profile', icon: User },
];

export default function RoleMobileNav({ role, navItems, basePath }: RoleMobileNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const base = basePath ?? (role === 'STUDENT' ? '/student' : role === 'TEACHER' || role === 'ADMIN' ? '/teacher' : '/');
  const all = navItems && navItems.length > 0 ? navItems : FALLBACK;
  // На нижнем баре помещается ~5 пунктов
  const items = all.slice(0, 5);
  const activeTab = searchParams.get('tab') ?? all[0]?.tab;

  return (
    <nav className="mobile-nav fixed bottom-0 left-0 right-0 z-50 block md:hidden border-t border-white/5 shadow-2xl">
      <div className="flex items-center justify-around px-2 pt-2.5 pb-6">
        {items.map(({ id, label, tab, icon: Icon }) => {
          const isActive = activeTab === tab;
          return (
            <Link
              key={id}
              href={`${base}?tab=${tab}`}
              className="flex flex-col items-center gap-1 min-w-[3.5rem] py-1 transition-colors duration-200"
              aria-label={label}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 1.5 : 1.3}
                className={`transition-colors duration-300 ${isActive ? 'text-[#D4AF37]' : 'text-white/60'}`}
              />
              <span
                className={`text-[9px] tracking-wide transition-colors duration-300 ${
                  isActive ? 'text-[#D4AF37] font-semibold' : 'text-white/50'
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
