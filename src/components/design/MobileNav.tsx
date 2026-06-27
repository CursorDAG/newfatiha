'use client';

import { useState } from 'react';
import { LayoutDashboard, GraduationCap, Calendar, User } from 'lucide-react';

/** Custom SVG Icon representing an open Quran on a Rehal stand */
function QuranIcon({ className, size = 20 }: { className?: string; size?: number }) {
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
      {/* Rehal support stand */}
      <path d="M5.5 18.5l4-3M18.5 18.5l-4-3" />
    </svg>
  );
}

const navItems = [
  { icon: LayoutDashboard, label: 'Главная', key: 'home' },
  { icon: GraduationCap, label: 'Курсы', key: 'courses' },
  { icon: QuranIcon, label: 'Коран', key: 'quran' },
  { icon: Calendar, label: 'Расписание', key: 'schedule' },
  { icon: User, label: 'Профиль', key: 'profile' },
] as const;

type NavKey = (typeof navItems)[number]['key'];

export default function MobileNav() {
  const [activeTab, setActiveTab] = useState<NavKey>('home');

  return (
    <nav className="mobile-nav fixed bottom-0 left-0 right-0 z-50 block md:hidden border-t border-white/5 shadow-2xl">
      <div className="flex items-center justify-around px-2 pt-2.5 pb-6">
        {navItems.map(({ icon: Icon, label, key }) => {
          const isActive = activeTab === key;

          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex flex-col items-center gap-1 min-w-[3.5rem] py-1 transition-colors duration-200"
              aria-label={label}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 1.5 : 1.3}
                className={`transition-colors duration-300 ${
                  isActive ? 'text-[#D4AF37]' : 'text-white/60'
                }`}
              />
              <span
                className={`text-[9px] tracking-wide transition-colors duration-300 ${
                  isActive
                    ? 'text-[#D4AF37] font-semibold'
                    : 'text-white/50'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
