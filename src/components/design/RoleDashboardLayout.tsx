'use client';

import RoleSidebar, { type RoleNavItem } from './RoleSidebar';
import RoleHeader from './RoleHeader';
import RoleMobileNav from './RoleMobileNav';

interface RoleDashboardLayoutProps {
  children: React.ReactNode;
  role: string;
  userName?: string;
  userInitials?: string;
  notificationCount?: number;
  showRightSidebar?: boolean;
  rightSidebar?: React.ReactNode;
  /** Список вкладок дашборда — единый источник навигации */
  navItems?: RoleNavItem[];
  /** Базовый путь (/student или /teacher) */
  basePath?: string;
}

/**
 * RoleDashboardLayout — единая обёртка для всех dashboard-страниц с новым дизайном.
 * Навигация ведётся через ?tab= и общий список navItems (без двойного меню).
 */
export default function RoleDashboardLayout({
  children,
  role,
  userName,
  userInitials,
  notificationCount = 0,
  showRightSidebar = false,
  rightSidebar,
  navItems,
  basePath,
}: RoleDashboardLayoutProps) {
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* ===== AMBIENT BACKGROUND GLOW SPOTS ===== */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[10%] -right-[10%] h-[600px] w-[600px] rounded-full bg-[#D4AF37]/[0.03] blur-[130px]" />
        <div className="absolute top-[25%] -left-[15%] h-[700px] w-[700px] rounded-full bg-[#06201A]/50 blur-[150px]" />
        <div className="absolute -bottom-[15%] -right-[5%] h-[800px] w-[800px] rounded-full bg-[#D4AF37]/[0.02] blur-[160px]" />
      </div>

      {/* ===== LEFT SIDEBAR (Desktop only, fixed 280px) — единственная навигация ===== */}
      <RoleSidebar
        role={role}
        userName={userName}
        userInitials={userInitials}
        navItems={navItems}
        basePath={basePath}
      />

      {/* ===== MAIN WRAPPER (отступ слева под левый сайдбар) ===== */}
      <div className="lg:ml-[280px] flex flex-col min-h-screen relative z-10">
        <RoleHeader
          role={role}
          userName={userName}
          userInitials={userInitials}
          notificationCount={notificationCount}
          navItems={navItems}
          basePath={basePath}
        />

        <div className="flex-1 flex flex-col lg:flex-row pb-24 md:pb-0">
          <main className="flex-1 min-w-0 flex flex-col">
            <div className="w-[96%] mx-auto py-6 space-y-8">
              {children}
            </div>
          </main>

          {showRightSidebar && rightSidebar && (
            <aside className="lg:w-[360px] lg:shrink-0 px-4 pb-6 lg:px-2 lg:py-6">
              {rightSidebar}
            </aside>
          )}
        </div>
      </div>

      {/* ===== Mobile bottom nav ===== */}
      <RoleMobileNav role={role} navItems={navItems} basePath={basePath} />
    </div>
  );
}
