'use client';

import Sidebar from '@/components/design/Sidebar';
import Header from '@/components/design/Header';
import MobileNav from '@/components/design/MobileNav';
import RightSidebar from '@/components/design/RightSidebar';

/**
 * DashboardLayout — единая обёртка для всех dashboard-страниц.
 *
 * Desktop (≥lg):
 *   ┌──────────┬─────────────────────────────────────────┬──────────────┐
 *   │          │           Header                        │              │
 *   │ Sidebar  ├─────────────────────────────────────────┼──────────────┤
 *   │ (280px)  │  HeroBanner — edge-to-edge,             │ RightSidebar │
 *   │ fixed    │  без отступов между сайдбарами           │              │
 *   ├          ├─────────────────────────────────────────┼──────────────┤
 *   │          │  Content — 92% ширины, центрирован      │              │
 *   └──────────┴─────────────────────────────────────────┴──────────────┘
 *
 * Mobile/Tablet: одна колонка, RightSidebar стэком ниже.
 */
export default function DashboardLayout({
  children,
  showRightSidebar = true,
}: {
  children: React.ReactNode;
  showRightSidebar?: boolean;
}) {
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

      {/* ===== LEFT SIDEBAR (Desktop only, fixed 280px) ===== */}
      <Sidebar />

      {/* ===== MAIN WRAPPER (отступ слева под левый сайдбар) ===== */}
      <div className="lg:ml-[280px] flex flex-col min-h-screen">
        {/* Header растянут на всю ширину области */}
        <Header />

        {/* ===== Главный flex-row: main + правый купол прижат к правому краю ===== */}
        <div className="flex-1 flex flex-col lg:flex-row pb-24 md:pb-0">
          {/* ── Центральная колонка ────────────────────────────────── */}
          <main className="flex-1 min-w-0 flex flex-col">
            {/* Контент — 92% ширины, центрирован */}
            <div className="w-[92%] mx-auto py-8 space-y-8">
              {children}
            </div>
          </main>

          {/* ── Правая колонка-купол (прижата к правому краю) ──────── */}
          {showRightSidebar && (
            <aside className="lg:w-[360px] lg:shrink-0 px-4 pb-6 lg:px-2 lg:py-2">
              <RightSidebar />
            </aside>
          )}
        </div>
      </div>

      {/* ===== Mobile bottom nav ===== */}
      <MobileNav />
    </div>
  );
}
